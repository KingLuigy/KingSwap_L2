const { expectRevert } = require('@openzeppelin/test-helpers');
const KingToken = artifacts.require('KingToken');
const KingServant = artifacts.require('KingServant');
const MockERC20 = artifacts.require('MockERC20');
const KingSwapPair = artifacts.require('KingSwapPair');
const KingSwapFactory = artifacts.require('KingSwapFactory');

contract('KingServant', ([alice, table, minter]) => {
    beforeEach(async () => {
        this.factory = await KingSwapFactory.new(alice, { from: alice });
        this.king = await KingToken.new({ from: alice });
        await this.king.mint(minter, '100000000', { from: alice });
        this.weth = await MockERC20.new('WETH', 'WETH', '100000000', { from: minter });
        this.token1 = await MockERC20.new('TOKEN1', 'TOKEN', '100000000', { from: minter });
        this.token2 = await MockERC20.new('TOKEN2', 'TOKEN2', '100000000', { from: minter });
        this.servant = await KingServant.new(this.factory.address, table, this.king.address, this.weth.address);
        this.kingWETH = await KingSwapPair.at((await this.factory.createPair(this.weth.address, this.king.address)).logs[0].args.pair);
        this.wethToken1 = await KingSwapPair.at((await this.factory.createPair(this.weth.address, this.token1.address)).logs[0].args.pair);
        this.wethToken2 = await KingSwapPair.at((await this.factory.createPair(this.weth.address, this.token2.address)).logs[0].args.pair);
        this.token1Token2 = await KingSwapPair.at((await this.factory.createPair(this.token1.address, this.token2.address)).logs[0].args.pair);
        this.blackHoldAddress = '0000000000000000000000000000000000000001';
    });

    it('should transfer owner successfully', async () => {
        assert.equal(await this.servant.owner(), alice);
        await this.servant.transferOwnership(table);
        assert.equal(await this.servant.owner(), table);
    })

    it('should set burn ratio successfully', async () => {
        assert.equal(await this.servant.burnRatio(), 0);
        await this.servant.setBurnRatio(0, { from: alice });
        assert.equal(await this.servant.burnRatio(), 0);
        await this.servant.setBurnRatio(10, { from: alice });
        assert.equal(await this.servant.burnRatio(), 10);
        await expectRevert(this.servant.setBurnRatio(11, { from: alice }), 'invalid burn ratio');
        await expectRevert(this.servant.setBurnRatio(10, { from: table }), 'Ownable: caller is not the owner');
    })

    it('should make $KINGs successfully', async () => {
        await this.factory.setFeeTo(this.servant.address, { from: alice });
        await this.weth.transfer(this.kingWETH.address, '10000000', { from: minter });
        await this.king.transfer(this.kingWETH.address, '10000000', { from: minter });
        await this.kingWETH.mint(minter);
        await this.weth.transfer(this.wethToken1.address, '10000000', { from: minter });
        await this.token1.transfer(this.wethToken1.address, '10000000', { from: minter });
        await this.wethToken1.mint(minter);
        await this.weth.transfer(this.wethToken2.address, '10000000', { from: minter });
        await this.token2.transfer(this.wethToken2.address, '10000000', { from: minter });
        await this.wethToken2.mint(minter);
        await this.token1.transfer(this.token1Token2.address, '10000000', { from: minter });
        await this.token2.transfer(this.token1Token2.address, '10000000', { from: minter });
        await this.token1Token2.mint(minter);
        // Fake some revenue
        await this.token1.transfer(this.token1Token2.address, '100000', { from: minter });
        await this.token2.transfer(this.token1Token2.address, '100000', { from: minter });
        await this.token1Token2.sync();
        await this.token1.transfer(this.token1Token2.address, '10000000', { from: minter });
        await this.token2.transfer(this.token1Token2.address, '10000000', { from: minter });
        await this.token1Token2.mint(minter);
        // Maker should have the LP now
        assert.equal((await this.token1Token2.balanceOf(this.servant.address)).valueOf(), '19841');
        // After calling convert, table should have $KING value at ~1/5 of revenue
        await this.servant.convert(this.token1.address, this.token2.address);
        assert.equal((await this.king.balanceOf(table)).valueOf(), '39561');
        assert.equal((await this.king.balanceOf(this.blackHoldAddress)).valueOf(), '0');
        assert.equal((await this.token1Token2.balanceOf(this.servant.address)).valueOf(), '0');
        // Should also work for $KING-ETH pair
        await this.king.transfer(this.kingWETH.address, '100000', { from: minter });
        await this.weth.transfer(this.kingWETH.address, '100000', { from: minter });
        await this.kingWETH.sync();
        await this.king.transfer(this.kingWETH.address, '10000000', { from: minter });
        await this.weth.transfer(this.kingWETH.address, '10000000', { from: minter });
        await this.kingWETH.mint(minter);
        assert.equal((await this.kingWETH.balanceOf(this.servant.address)).valueOf(), '19851');
        await this.servant.convert(this.king.address, this.weth.address);
        assert.equal((await this.king.balanceOf(table)).valueOf(), '79508');
        assert.equal((await this.king.balanceOf(this.blackHoldAddress)).valueOf(), '0');
        assert.equal((await this.kingWETH.balanceOf(this.servant.address)).valueOf(), '0');
    });

    it('should make $KINGs with new burn ratio successfully', async () => {
        await this.factory.setFeeTo(this.servant.address, { from: alice });
        await this.servant.setBurnRatio(5, { from: alice });
        await this.weth.transfer(this.kingWETH.address, '10000000', { from: minter });
        await this.king.transfer(this.kingWETH.address, '10000000', { from: minter });
        await this.kingWETH.mint(minter);
        await this.weth.transfer(this.wethToken1.address, '10000000', { from: minter });
        await this.token1.transfer(this.wethToken1.address, '10000000', { from: minter });
        await this.wethToken1.mint(minter);
        await this.weth.transfer(this.wethToken2.address, '10000000', { from: minter });
        await this.token2.transfer(this.wethToken2.address, '10000000', { from: minter });
        await this.wethToken2.mint(minter);
        await this.token1.transfer(this.token1Token2.address, '10000000', { from: minter });
        await this.token2.transfer(this.token1Token2.address, '10000000', { from: minter });
        await this.token1Token2.mint(minter);
        // Fake some revenue
        await this.token1.transfer(this.token1Token2.address, '100000', { from: minter });
        await this.token2.transfer(this.token1Token2.address, '100000', { from: minter });
        await this.token1Token2.sync();
        await this.token1.transfer(this.token1Token2.address, '10000000', { from: minter });
        await this.token2.transfer(this.token1Token2.address, '10000000', { from: minter });
        await this.token1Token2.mint(minter);
        // Maker should have the LP now
        assert.equal((await this.token1Token2.balanceOf(this.servant.address)).valueOf(), '19841');
        // After calling convert, table should have $KING value at ~1/5 of revenue
        await this.servant.convert(this.token1.address, this.token2.address);
        assert.equal((await this.king.balanceOf(table)).valueOf(), '19819');
        assert.equal((await this.king.balanceOf(this.blackHoldAddress)).valueOf(), '19741');
        assert.equal((await this.token1Token2.balanceOf(this.servant.address)).valueOf(), '0');
        // Should also work for $KING-ETH pair
        await this.king.transfer(this.kingWETH.address, '100000', { from: minter });
        await this.weth.transfer(this.kingWETH.address, '100000', { from: minter });
        await this.kingWETH.sync();
        await this.king.transfer(this.kingWETH.address, '10000000', { from: minter });
        await this.weth.transfer(this.kingWETH.address, '10000000', { from: minter });
        await this.kingWETH.mint(minter);
        assert.equal((await this.kingWETH.balanceOf(this.servant.address)).valueOf(), '19851');
        await this.servant.convert(this.king.address, this.weth.address);
        assert.equal((await this.king.balanceOf(table)).valueOf(), '39798');
        assert.equal((await this.king.balanceOf(this.blackHoldAddress)).valueOf(), '39709');
        assert.equal((await this.kingWETH.balanceOf(this.servant.address)).valueOf(), '0');
    })
});
