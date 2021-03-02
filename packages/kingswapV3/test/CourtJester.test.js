const { expectRevert } = require('@openzeppelin/test-helpers');
const KingToken = artifacts.require('KingToken');
const MockERC20 = artifacts.require('MockERC20');
const KingSwapPair = artifacts.require('KingSwapPair');
const KingSwapFactory = artifacts.require('KingSwapFactory');
const CourtJester = artifacts.require('CourtJester');

contract('CourtJester', ([alice, bob]) => {
    beforeEach(async () => {
        this.factory = await KingSwapFactory.new(alice, { from: alice });
        this.king = await KingToken.new({ from: alice });
        await this.king.mint(alice, '100000000', { from: alice });
        this.uni = await MockERC20.new('UNI', 'UNI', '100000000', { from: alice });
        this.kinguni = await KingSwapPair.at((await this.factory.createPair(this.king.address, this.uni.address)).logs[0].args.pair);
        this.blackHoldAddress = '0000000000000000000000000000000000000001';
        this.CourtJester = await CourtJester.new(this.factory.address, this.king.address, this.uni.address);
    });

    it('only owner can set factory', async () => {
        assert.equal(await this.CourtJester.owner(), alice);
        assert.equal(await this.CourtJester.factory(), this.factory.address);
        await expectRevert(this.CourtJester.setFactory(bob, { from: bob }), 'only owner');
        await this.CourtJester.setFactory(bob, { from: alice });
        assert.equal(await this.CourtJester.factory(), bob);
    });

    it('should convert uni to king successfully', async () => {
        // add liquidity
        await this.king.transfer(this.kinguni.address, '100000', { from: alice });
        await this.uni.transfer(this.kinguni.address, '100000', { from: alice });
        await this.kinguni.sync();
        await this.king.transfer(this.kinguni.address, '10000000', { from: alice });
        await this.uni.transfer(this.kinguni.address, '10000000', { from: alice });
        await this.kinguni.mint(alice);

        await this.uni.transfer(this.CourtJester.address, '1000');
        await this.CourtJester.convert();
        assert.equal(await this.uni.balanceOf(this.CourtJester.address), '0');
        assert.equal(await this.king.balanceOf(this.blackHoldAddress), '997');
    });

    context('KingSwapPair::lockIn', () => {
        beforeEach(async () => {
            // add liquidity
            await this.king.transfer(this.kinguni.address, '100000', { from: alice });
            await this.uni.transfer(this.kinguni.address, '100000', { from: alice });
            await this.kinguni.sync();
            await this.king.transfer(this.kinguni.address, '10000000', { from: alice });
            await this.uni.transfer(this.kinguni.address, '10000000', { from: alice });
            await this.kinguni.mint(alice);
            await this.uni.transfer(this.CourtJester.address, '1000');
        });

        it('should be able to convert uni to king no pair route is locked', async () => {
            await this.factory.lockInPair(this.king.address, this.uni.address, false, false);
            await this.CourtJester.convert();
            assert.equal(await this.uni.balanceOf(this.CourtJester.address), '0');
            assert.equal(await this.king.balanceOf(this.blackHoldAddress), '997');
        });

        it('should not be able to convert uni to king when uni -> king pair route is locked', async () => {
            await this.factory.lockInPair(this.king.address, this.uni.address, true, false);
            await expectRevert(this.CourtJester.convert(), 'KingSwap: TOKEN_LOCKED_IN.');
        });

        it('should be able to convert uni to king when king -> uni pair route is locked', async () => {
            await this.factory.lockInPair(this.king.address, this.uni.address, false, true);
            await this.CourtJester.convert();
            assert.equal(await this.uni.balanceOf(this.CourtJester.address), '0');
            assert.equal(await this.king.balanceOf(this.blackHoldAddress), '997');
        });

        it('should not be able to convert uni to king when both pair routes are locked', async () => {
            await this.factory.lockInPair(this.king.address, this.uni.address, true, true);
            await expectRevert(this.CourtJester.convert(), 'KingSwap: TOKEN_LOCKED_IN.');
        });
    });
})
