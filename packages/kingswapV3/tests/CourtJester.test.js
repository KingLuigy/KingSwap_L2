const { expectRevert } = require('@openzeppelin/test-helpers');
const { createSnapshot, revertToSnapshot } = require('./helpers/blockchain');

const MockERC677Token = artifacts.require('MockERC677Token');
const MockERC20 = artifacts.require('MockERC20');
const { abi: pairAbi } = require('../resources/kingswapUni-v2-core/KingSwapPair.json');
const { abi: factoryAbi, bytecode: factoryCode } = require('../resources/kingswapUni-v2-core/KingSwapFactory.json');
const CourtJester = artifacts.require('CourtJester');

contract('CourtJester', ([alice, bob]) => {
    const getTxOpts = (opts = {}) => Object.assign({ from: alice, gas: 5000000 }, opts)

    before(async () => {
        this.factory = await (new web3.eth.Contract(factoryAbi, {data: factoryCode}))
            .deploy({arguments: [alice]}).send(getTxOpts({ gas: 5000000 }))
        this.king = await MockERC677Token.new('100000000', getTxOpts());
        this.uni = await MockERC20.new('100000000', getTxOpts());
        this.kinguni = new web3.eth.Contract(
            pairAbi,
            (await this.factory.methods.createPair(this.king.address, this.uni.address).send(getTxOpts()))
                .events['PairCreated'].returnValues.pair
        );
        this.blackHoldAddress = '0000000000000000000000000000000000000001';
        this.CourtJester = await CourtJester.new(this.factory.options.address, this.king.address, this.uni.address);
    });

    let snapshotId
    beforeEach(async () => {
        snapshotId = await createSnapshot();
    })
    afterEach(async () => {
        await revertToSnapshot(snapshotId)
    })

    it('only owner can set factory', async () => {
        assert.equal(await this.CourtJester.owner(), alice);
        assert.equal(await this.CourtJester.factory(), this.factory.options.address);
        await expectRevert(this.CourtJester.setFactory(bob, { from: bob }), 'only owner');
        await this.CourtJester.setFactory(bob, getTxOpts());
        assert.equal(await this.CourtJester.factory(), bob);
    });

    it('should convert uni to king successfully', async () => {
        // add liquidity
        await this.king.transfer(this.kinguni.options.address, '100000', { from: alice });
        await this.uni.transfer(this.kinguni.options.address, '100000', { from: alice });
        await this.kinguni.methods.sync().send(getTxOpts());
        await this.king.transfer(this.kinguni.options.address, '10000000', { from: alice });
        await this.uni.transfer(this.kinguni.options.address, '10000000', { from: alice });
        await this.kinguni.methods.mint(alice).send(getTxOpts());

        await this.uni.transfer(this.CourtJester.address, '1000');
        await this.CourtJester.convert();
        assert.equal(await this.uni.balanceOf(this.CourtJester.address), '0');
        assert.equal(await this.king.balanceOf(this.blackHoldAddress), '997');
    });

    context('KingSwapPair::lockIn', () => {
        beforeEach(async () => {
            // add liquidity
            await this.king.transfer(this.kinguni.options.address, '100000', { from: alice });
            await this.uni.transfer(this.kinguni.options.address, '100000', { from: alice });
            await this.kinguni.methods.sync().send(getTxOpts());
            await this.king.transfer(this.kinguni.options.address, '10000000', { from: alice });
            await this.uni.transfer(this.kinguni.options.address, '10000000', { from: alice });
            await this.kinguni.methods.mint(alice).send(getTxOpts());
            await this.uni.transfer(this.CourtJester.address, '1000');
        });

        it('should be able to convert uni to king no pair route is locked', async () => {
            await this.factory.methods.lockInPair(this.king.address, this.uni.address, false, false).send(getTxOpts());
            await this.CourtJester.convert();
            assert.equal(await this.uni.balanceOf(this.CourtJester.address), '0');
            assert.equal(await this.king.balanceOf(this.blackHoldAddress), '997');
        });

        it('should not be able to convert uni to king when uni -> king pair route is locked', async () => {
            await this.factory.methods.lockInPair(this.king.address, this.uni.address, true, false).send(getTxOpts());
            await expectRevert(this.CourtJester.convert(), 'KingSwap: TOKEN_LOCKED_IN.');
        });

        it('should be able to convert uni to king when king -> uni pair route is locked', async () => {
            await this.factory.methods.lockInPair(this.king.address, this.uni.address, false, true).send(getTxOpts());
            await this.CourtJester.convert();
            assert.equal(await this.uni.balanceOf(this.CourtJester.address), '0');
            assert.equal(await this.king.balanceOf(this.blackHoldAddress), '997');
        });

        it('should not be able to convert uni to king when both pair routes are locked', async () => {
            await this.factory.methods.lockInPair(this.king.address, this.uni.address, true, true).send(getTxOpts());
            await expectRevert(this.CourtJester.convert(), 'KingSwap: TOKEN_LOCKED_IN.');
        });
    });
})
