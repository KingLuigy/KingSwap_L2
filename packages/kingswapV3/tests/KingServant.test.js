/* global artifacts, contract, before, beforeEach, it, web3 */
const { expectRevert } = require('@openzeppelin/test-helpers');
const { createSnapshot, revertToSnapshot } = require('./helpers/blockchain');

const MockERC677Token = artifacts.require('MockERC677Token');
const KingServant = artifacts.require('KingServant');
const MockERC20 = artifacts.require('MockERC20');
const { abi: pairAbi } = require('../resources/kingswapUni-v2-core/KingSwapPair.json');
const { abi: factoryAbi, bytecode: factoryCode } = require('../resources/kingswapUni-v2-core/KingSwapFactory.json');

contract('KingServant', ([alice, table, minter]) => {
    const getTxOpts = (opts = {}) => Object.assign({ from: alice, gas: 5000000 }, opts)

    before(async () => {
        this.factory = await (new web3.eth.Contract(factoryAbi, {data: factoryCode}))
            .deploy({arguments: [alice]}).send(getTxOpts({ gas: 5000000 }))
        this.king = await MockERC677Token.new(0, getTxOpts());
        await this.king._mockMint(minter, '100000000', getTxOpts());
        this.weth = await MockERC20.new('100000000', { from: minter });
        this.token1 = await MockERC20.new('100000000', { from: minter });
        this.token2 = await MockERC20.new('100000000', { from: minter });
        this.servant = await KingServant.new(this.factory.options.address, table, this.king.address, this.weth.address);
        this.kingWETH = new web3.eth.Contract(
            pairAbi,
            (await this.factory.methods.createPair(this.weth.address, this.king.address).send(getTxOpts()))
                .events['PairCreated'].returnValues.pair
        );
        this.wethToken1 = new web3.eth.Contract(
            pairAbi,
            (await this.factory.methods.createPair(this.weth.address, this.token1.address).send(getTxOpts()))
                .events['PairCreated'].returnValues.pair
        );
        this.wethToken2 = new web3.eth.Contract(
            pairAbi,
            (await this.factory.methods.createPair(this.weth.address, this.token2.address).send(getTxOpts()))
                .events['PairCreated'].returnValues.pair
        );
        this.token1Token2 = new web3.eth.Contract(
            pairAbi,
            (await this.factory.methods.createPair(this.token1.address, this.token2.address).send(getTxOpts()))
                .events['PairCreated'].returnValues.pair
        );
        this.blackHoldAddress = '0000000000000000000000000000000000000001';
    });

    let snapshotId
    beforeEach(async () => {
        snapshotId = await createSnapshot();
    })
    afterEach(async () => {
        await revertToSnapshot(snapshotId)
    })

    it('should transfer owner successfully', async () => {
        assert.equal(await this.servant.owner(), alice);
        await this.servant.transferOwnership(table, getTxOpts());
        assert.equal(await this.servant.owner(), table);
    })

    it('should set burn ratio successfully', async () => {
        assert.equal(await this.servant.burnRatio(), 0);
        await this.servant.setBurnRatio(0, getTxOpts());
        assert.equal(await this.servant.burnRatio(), 0);
        await this.servant.setBurnRatio(10, getTxOpts());
        assert.equal(await this.servant.burnRatio(), 10);
        await expectRevert(this.servant.setBurnRatio(11, getTxOpts()), 'invalid burn ratio');
        await expectRevert(this.servant.setBurnRatio(10, { from: table }), 'Ownable: caller is not the owner');
    })

    it('should make $KINGs successfully', async () => {
        await this.factory.methods.setFeeTo(this.servant.address).send(getTxOpts());
        await this.weth.transfer(this.kingWETH.options.address, '10000000', { from: minter });
        await this.king.transfer(this.kingWETH.options.address, '10000000', { from: minter });
        await this.kingWETH.methods.mint(minter).send(getTxOpts());
        await this.weth.transfer(this.wethToken1.options.address, '10000000', { from: minter });
        await this.token1.transfer(this.wethToken1.options.address, '10000000', { from: minter });
        await this.wethToken1.methods.mint(minter).send(getTxOpts());
        await this.weth.transfer(this.wethToken2.options.address, '10000000', { from: minter });
        await this.token2.transfer(this.wethToken2.options.address, '10000000', { from: minter });
        await this.wethToken2.methods.mint(minter).send(getTxOpts());
        await this.token1.transfer(this.token1Token2.options.address, '10000000', { from: minter });
        await this.token2.transfer(this.token1Token2.options.address, '10000000', { from: minter });
        await this.token1Token2.methods.mint(minter).send(getTxOpts());
        // Fake some revenue
        await this.token1.transfer(this.token1Token2.options.address, '100000', { from: minter });
        await this.token2.transfer(this.token1Token2.options.address, '100000', { from: minter });
        await this.token1Token2.methods.sync().send(getTxOpts());
        await this.token1.transfer(this.token1Token2.options.address, '10000000', { from: minter });
        await this.token2.transfer(this.token1Token2.options.address, '10000000', { from: minter });
        await this.token1Token2.methods.mint(minter).send(getTxOpts());
        // Maker should have the LP now
        assert.equal((await this.token1Token2.methods.balanceOf(this.servant.address).call()).valueOf(), '19841');
        // After calling convert, table should have $KING value at ~1/5 of revenue
        await this.servant.convert(this.token1.address, this.token2.address);
        assert.equal((await this.king.balanceOf(table)).valueOf(), '39561');
        assert.equal((await this.king.balanceOf(this.blackHoldAddress)).valueOf(), '0');
        assert.equal((await this.token1Token2.methods.balanceOf(this.servant.address).call()).valueOf(), '0');
        // Should also work for $KING-ETH pair
        await this.king.transfer(this.kingWETH.options.address, '100000', { from: minter });
        await this.weth.transfer(this.kingWETH.options.address, '100000', { from: minter });
        await this.kingWETH.methods.sync().send(getTxOpts());
        await this.king.transfer(this.kingWETH.options.address, '10000000', { from: minter });
        await this.weth.transfer(this.kingWETH.options.address, '10000000', { from: minter });
        await this.kingWETH.methods.mint(minter).send(getTxOpts());
        assert.equal((await this.kingWETH.methods.balanceOf(this.servant.address).call()).valueOf(), '19851');
        await this.servant.convert(this.king.address, this.weth.address);
        assert.equal((await this.king.balanceOf(table)).valueOf(), '79508');
        assert.equal((await this.king.balanceOf(this.blackHoldAddress)).valueOf(), '0');
        assert.equal((await this.kingWETH.methods.balanceOf(this.servant.address).call()).valueOf(), '0');
    });

    it('should make $KINGs with new burn ratio successfully', async () => {
        await this.factory.methods.setFeeTo(this.servant.address).send(getTxOpts());
        await this.servant.setBurnRatio(5, getTxOpts());
        await this.weth.transfer(this.kingWETH.options.address, '10000000', { from: minter });
        await this.king.transfer(this.kingWETH.options.address, '10000000', { from: minter });
        await this.kingWETH.methods.mint(minter).send(getTxOpts());
        await this.weth.transfer(this.wethToken1.options.address, '10000000', { from: minter });
        await this.token1.transfer(this.wethToken1.options.address, '10000000', { from: minter });
        await this.wethToken1.methods.mint(minter).send(getTxOpts());
        await this.weth.transfer(this.wethToken2.options.address, '10000000', { from: minter });
        await this.token2.transfer(this.wethToken2.options.address, '10000000', { from: minter });
        await this.wethToken2.methods.mint(minter).send(getTxOpts());
        await this.token1.transfer(this.token1Token2.options.address, '10000000', { from: minter });
        await this.token2.transfer(this.token1Token2.options.address, '10000000', { from: minter });
        await this.token1Token2.methods.mint(minter).send(getTxOpts());
        // Fake some revenue
        await this.token1.transfer(this.token1Token2.options.address, '100000', { from: minter });
        await this.token2.transfer(this.token1Token2.options.address, '100000', { from: minter });
        await this.token1Token2.methods.sync().send(getTxOpts());
        await this.token1.transfer(this.token1Token2.options.address, '10000000', { from: minter });
        await this.token2.transfer(this.token1Token2.options.address, '10000000', { from: minter });
        await this.token1Token2.methods.mint(minter).send(getTxOpts());
        // Maker should have the LP now
        assert.equal((await this.token1Token2.methods.balanceOf(this.servant.address).call()).valueOf(), '19841');
        // After calling convert, table should have $KING value at ~1/5 of revenue
        await this.servant.convert(this.token1.address, this.token2.address);
        assert.equal((await this.king.balanceOf(table)).valueOf(), '19819');
        assert.equal((await this.king.balanceOf(this.blackHoldAddress)).valueOf(), '19741');
        assert.equal((await this.token1Token2.methods.balanceOf(this.servant.address).call()).valueOf(), '0');
        // Should also work for $KING-ETH pair
        await this.king.transfer(this.kingWETH.options.address, '100000', { from: minter });
        await this.weth.transfer(this.kingWETH.options.address, '100000', { from: minter });
        await this.kingWETH.methods.sync().send(getTxOpts());
        await this.king.transfer(this.kingWETH.options.address, '10000000', { from: minter });
        await this.weth.transfer(this.kingWETH.options.address, '10000000', { from: minter });
        await this.kingWETH.methods.mint(minter).send(getTxOpts());
        assert.equal((await this.kingWETH.methods.balanceOf(this.servant.address).call()).valueOf(), '19851');
        await this.servant.convert(this.king.address, this.weth.address);
        assert.equal((await this.king.balanceOf(table)).valueOf(), '39798');
        assert.equal((await this.king.balanceOf(this.blackHoldAddress)).valueOf(), '39709');
        assert.equal((await this.kingWETH.methods.balanceOf(this.servant.address).call()).valueOf(), '0');
    })
});
