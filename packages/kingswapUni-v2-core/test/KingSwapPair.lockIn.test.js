const { expectRevert } = require('@openzeppelin/test-helpers');

const { createSnapshot, revertToSnapshot } = require('./helpers/blockchain');

const MockERC20 = artifacts.require('MockERC20');
const KingSwapPair = artifacts.require('KingSwapPair');
const KingSwapFactory = artifacts.require('KingSwapFactory');

contract('KingSwapPair::lockIn', ([alice]) => {
    before(async () => {
        this.factory = await KingSwapFactory.new(alice);
        this.king = await MockERC20.new('100000000');
        this.uni = await MockERC20.new('100000000');
        this.pair = await KingSwapPair.at((await this.factory.createPair(this.king.address, this.uni.address)).logs[0].args.pair);
        // add liquidity
        await this.king.transfer(this.pair.address, '10000000');
        await this.uni.transfer(this.pair.address, '10000000');
        await this.pair.mint(alice);
        await this.king.transfer(this.pair.address, '10000000');
        await this.uni.transfer(this.pair.address, '10000000');
    });

    let snapshotId
    beforeEach(async () => {
        snapshotId = await createSnapshot();
    })

    afterEach(async () => {
        await revertToSnapshot(snapshotId)
    })

    context('lockedIn0 == true && lockedIn1 == false', () => {
        beforeEach(async () => {
            this.token0 = await this.pair.token0.call();
            this.token1 = await this.pair.token1.call();
            await this.factory.lockInPair(this.token0, this.token1, true, false);
        });

        it('Should allow swap on: (amount0Out == 0 && amount1Out != 0)', async () => {
            const token1 = await MockERC20.at(this.token1)
            let balanceBefore = await token1.balanceOf(alice);
            await this.pair.swap('0', '10', alice, []);
            let balanceAfter = await token1.balanceOf(alice);
            assert.equal(balanceAfter.sub(balanceBefore), '10');
        });

        it('Should forbid swap on: (amount0Out == 0 && amount1Out == 0)', async () => {
            await expectRevert(this.pair.swap('0', '0', alice, []), 'Reason given: KingSwap: INSUFFICIENT_OUTPUT_AMOUNT');
        });

        it('Should forbid swap on: (amount0Out != 0 && amount1Out != 0)', async () => {
            await expectRevert(this.pair.swap('10', '10', alice, []), 'Reason given: KingSwap: TOKEN_LOCKED_IN');
        });

        it('Should forbid swap on: (amount0Out != 0 && amount1Out == 0)', async () => {
            await expectRevert(this.pair.swap('10', '0', alice, []), 'Reason given: KingSwap: TOKEN_LOCKED_IN');
        });
    });

    context('lockedIn0 == true && lockedIn1 == true', () => {
        beforeEach(async () => {
            this.token0 = await this.pair.token0.call();
            this.token1 = await this.pair.token1.call();
            await this.factory.lockInPair(this.token0, this.token1, true, true);
        });

        it('Should forbid swap on: (amount0Out == 0 && amount1Out != 0)', async () => {
            await expectRevert(this.pair.swap('0', '10', alice, []), 'Reason given: KingSwap: TOKEN_LOCKED_IN');
        });

        it('Should forbid swap on: (amount0Out == 0 && amount1Out == 0)', async () => {
            await expectRevert(this.pair.swap('0', '0', alice, []), 'KingSwap: INSUFFICIENT_OUTPUT_AMOUNT');
        });

        it('Should forbid swap on: (amount0Out != 0 && amount1Out != 0)', async () => {
            await expectRevert(this.pair.swap('10', '10', alice, []), 'Reason given: KingSwap: TOKEN_LOCKED_IN');
        });

        it('Should forbid swap on: (amount0Out != 0 && amount1Out == 0)', async () => {
            await expectRevert(this.pair.swap('10', '0', alice, []), 'Reason given: KingSwap: TOKEN_LOCKED_IN');
        });
    });

    context('lockedIn0 == false && lockedIn1 == false', () => {
        beforeEach(async () => {
            this.token0 = await this.pair.token0.call();
            this.token1 = await this.pair.token1.call();
            await this.factory.lockInPair(this.token0, this.token1, false, false);
        });

        it('Should allow swap on: (amount0Out == 0 && amount1Out != 0)', async () => {
            const token1 = await MockERC20.at(this.token1)
            let balanceBefore = await token1.balanceOf(alice);
            await this.pair.swap('0', '10', alice, []);
            let balanceAfter = await token1.balanceOf(alice);
            assert.equal(balanceAfter.sub(balanceBefore), '10');
        });

        it('Should forbid swap on: (amount0Out == 0 && amount1Out == 0)', async () => {
            await expectRevert(this.pair.swap('0', '0', alice, []), 'KingSwap: INSUFFICIENT_OUTPUT_AMOUNT');
        });

        it('Should allow swap on: (amount0Out != 0 && amount1Out != 0)', async () => {
            const token0 = await MockERC20.at(this.token0)
            const token1 = await MockERC20.at(this.token1)
            let balance0Before = await token0.balanceOf(alice);
            let balance1Before = await token1.balanceOf(alice);
            await this.pair.swap('10', '10', alice, []);
            let balance0After = await token0.balanceOf(alice);
            let balance1After = await token1.balanceOf(alice);
            assert.equal(balance0After.sub(balance0Before), '10');
            assert.equal(balance1After.sub(balance1Before), '10');
        });

        it('Should allow swap on: (amount0Out != 0 && amount1Out == 0)', async () => {
            const token0 = await MockERC20.at(this.token0)
            let balanceBefore = await token0.balanceOf(alice);
            await this.pair.swap('10', '0', alice, []);
            let balanceAfter = await token0.balanceOf(alice);
            assert.equal(balanceAfter.sub(balanceBefore), '10');
        });
    });

    context('lockedIn0 == false && lockedIn1 == true', () => {
        beforeEach(async () => {
            this.token0 = await this.pair.token0.call();
            this.token1 = await this.pair.token1.call();
            await this.factory.lockInPair(this.token0, this.token1, false, true);
        });

        it('Should forbid swap on: (amount0Out == 0 && amount1Out != 0)', async () => {
            await expectRevert(this.pair.swap('0', '10', alice, []), 'KingSwap: TOKEN_LOCKED_IN');
        });

        it('Should forbid swap on: (amount0Out == 0 && amount1Out == 0)', async () => {
            await expectRevert(this.pair.swap('0', '0', alice, []), 'KingSwap: INSUFFICIENT_OUTPUT_AMOUNT');
        });

        it('Should forbid swap on: (amount0Out != 0 && amount1Out != 0)', async () => {
            await expectRevert(this.pair.swap('10', '10', alice, []), 'KingSwap: TOKEN_LOCKED_IN');
        });

        it('Should allow swap on: (amount0Out != 0 && amount1Out == 0)', async () => {
            const token0 = await MockERC20.at(this.token0)
            let balanceBefore = await token0.balanceOf(alice);
            await this.pair.swap('10', '0', alice, []);
            let balanceAfter = await token0.balanceOf(alice);
            assert.equal(balanceAfter.sub(balanceBefore), '10');
        });
    });
})
