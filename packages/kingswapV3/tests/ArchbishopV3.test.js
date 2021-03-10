const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { ecsign } = require('ethereumjs-util');

const { createSnapshot, revertToSnapshot } = require('./helpers/blockchain');
const { getDomainSeparator } = require('./helpers/signUtils');

const MockERC677Token = artifacts.require('MockERC677Token');
const ArchbishopV3 = artifacts.require('ArchbishopV3');
const MockERC20 = artifacts.require('MockERC20');

const { keccak256 } = web3.utils
const { abi } = web3.eth;

contract('ArchbishopV3', ([ deployer, alice, bob, carol, courtJester, kingServant, minter]) => {
    const e18 = '000000000000000000';
    const contractName = 'ArchbishopV3'
    const chainId = 1; // Solidity' `assembly { chainId := chainid() }` returns '1' under ganache (which is buggy).
    let domainSeparator

    before(async () => {
        this.king = await MockERC677Token.new('0');
        this.testStartBlock = parseInt(await web3.eth.getBlockNumber());

        this.archV3 = await ArchbishopV3.new(
            this.king.address,
            kingServant,
            courtJester,
            `${this.testStartBlock}`,
            '100' // _withdrawInterval
        );
        domainSeparator = getDomainSeparator(contractName, this.archV3.address, chainId)

        await this.king._mockMint(this.archV3.address, '5000'+e18);

        await this.archV3.setFarmingParams(
            '5'+e18, // _kingPerLptFarmingBlock
            '1'+e18, // _kingPerStFarmingBlock
            `${this.testStartBlock + 400}`, // lptFarmingEndBlock
            `${this.testStartBlock + 600}`  // stFarmingEndBlock
        );
    });

    let snapshotId
    beforeEach(async () => {
            snapshotId = await createSnapshot();
    })
    afterEach(async () => {
        await revertToSnapshot(snapshotId)
    })

    it('should set correct state variables', async () => {
        const king = await this.archV3.king();
        const owner = await this.archV3.owner();
        const startBlock = await this.archV3.startBlock();
        const kingPerLptFarmingBlock = await this.archV3.kingPerLptFarmingBlock();
        const kingPerStFarmingBlock = await this.archV3.kingPerStFarmingBlock();
        const lptFarmingEndBlock = await this.archV3.lptFarmingEndBlock();
        const stFarmingEndBlock = await this.archV3.stFarmingEndBlock();
        assert.equal(king.toString(), this.king.address);
        assert.equal(owner.toString(), deployer);
        assert.equal(startBlock.toString(), `${this.testStartBlock}`);
        assert.equal(kingPerLptFarmingBlock.toString(), '5000000000000000000');
        assert.equal(kingPerStFarmingBlock.toString(), '1000000000000000000');
        assert.equal(lptFarmingEndBlock.toString(), `${this.testStartBlock + 400}`);
        assert.equal(stFarmingEndBlock.toString(), `${this.testStartBlock + 600}`);
    });

    it('should allow owner and only owner to update king Fee Address', async () => {
        assert.equal((await this.archV3.courtJester()).valueOf(), courtJester);
        await expectRevert(this.archV3.setCourtJester(bob, { from: carol }), 'Ownable: caller is not the owner');
        await this.archV3.setCourtJester(bob);
        assert.equal((await this.archV3.courtJester()).valueOf(), bob);
    });

    it('should allow owner and only owner to update kingServant', async () => {
        assert.equal((await this.archV3.kingServant()).valueOf(), kingServant);
        await expectRevert(this.archV3.setKingServant(bob, { from: carol }), 'Ownable: caller is not the owner');
        await this.archV3.setKingServant(bob);
        assert.equal((await this.archV3.kingServant()).valueOf(), bob);
    });

    it('should allow owner and only owner to update LP fee percent', async () => {
        assert.equal((await this.archV3.lpFeePct()).toString(), '0');
        await expectRevert(this.archV3.setLpFeePct('10', { from: carol }), 'Ownable: caller is not the owner');
        await expectRevert(this.archV3.setLpFeePct('200'), 'ArchV2::INVALID_PERCENT');
        await this.archV3.setLpFeePct('10');
        assert.equal((await this.archV3.lpFeePct()).toString(), '10');
    });

    it('should allow owner and only owner to update withdrawInterval', async () => {
        assert.equal((await this.archV3.withdrawInterval()).toString(), '100');
        await expectRevert(this.archV3.setWithdrawInterval('10', { from: carol }), 'Ownable: caller is not the owner');
        await this.archV3.setWithdrawInterval('1000');
        assert.equal((await this.archV3.withdrawInterval()).toString(), '1000');
    });

    it('should allow owner and only owner to update king fee percent', async () => {
        assert.equal((await this.archV3.kingFeePct()).toString(), '0');
        await expectRevert(this.archV3.setKingFeePct('20', { from: carol }), 'Ownable: caller is not the owner');
        await expectRevert(this.archV3.setKingFeePct('200'), 'ArchV2::INVALID_PERCENT');
        await this.archV3.setKingFeePct('20');
        assert.equal((await this.archV3.kingFeePct()).toString(), '20');
    });

    context('With enough $KING balance for distribution between farmers', () => {
        it('should allow owner and only owner to update farming params', async () => {
            await expectRevert(this.archV3.setFarmingParams(
                '3'+e18, // _kingPerLptFarmingBlock
                '2'+e18, // _kingPerStFarmingBlock
                `${this.testStartBlock + 1000}`, // lptFarmingBlocks
                `${this.testStartBlock + 1000}`, // stFarmingBlocks
                { from: bob }
            ), 'Ownable: caller is not the owner');
            // KING$ balance is '5000'+e18
            await this.archV3.setFarmingParams(
                '3'+e18, // _kingPerLptFarmingBlock
                '2'+e18, // _kingPerStFarmingBlock
                `${this.testStartBlock + 1000}`, // lptFarmingBlocks
                `${this.testStartBlock + 1000}`  // stFarmingBlocks
            );
            assert.equal((await this.archV3.kingPerLptFarmingBlock()).toString(), '3000000000000000000');
            assert.equal((await this.archV3.kingPerStFarmingBlock()).toString(), '2000000000000000000');
            assert.equal((await this.archV3.lptFarmingEndBlock()).toString(), `${this.testStartBlock + 1000}`);
            assert.equal((await this.archV3.stFarmingEndBlock()).toString(), `${this.testStartBlock + 1000}`);
        });
    });

    context('With the $KING balance not enough', () => {
        it('should revert on owner\' update of farming params', async () => {
            // KING$ balance is '5000'+e18
            await expectRevert(this.archV3.setFarmingParams(
                '3'+e18, // _kingPerLptFarmingBlock
                '2'+e18, // _kingPerStFarmingBlock
                `${this.testStartBlock + 2000}`, // lptFarmingBlocks
                `${this.testStartBlock + 2000}`  // stFarmingBlocks
            ), 'ArchV2::LOW_$KING_BALANCE');
        });
    });

    it('getMultiplier', async () => {
        const result1 = await this.archV3.getMultiplier(`${this.testStartBlock}`, `${this.testStartBlock + 1}`);
        assert.equal(result1.lpt.toString(), '1');
        assert.equal(result1.st.toString(), '1');
        const result2 = await this.archV3.getMultiplier(`${this.testStartBlock}`, `${this.testStartBlock + 400}`);
        assert.equal(result2.lpt.toString(), '400');
        assert.equal(result2.st.toString(), '400');
        const result3 = await this.archV3.getMultiplier(`${this.testStartBlock}`, `${this.testStartBlock + 600}`);
        assert.equal(result3.lpt.toString(), '400');
        assert.equal(result3.st.toString(), '600');
        const result4 = await this.archV3.getMultiplier(`${this.testStartBlock}`, `${this.testStartBlock + 800}`);
        assert.equal(result4.lpt.toString(), '400');
        assert.equal(result4.st.toString(), '600');
        const result5 = await this.archV3.getMultiplier(`${this.testStartBlock + 300}`, `${this.testStartBlock + 800}`);
        assert.equal(result5.lpt.toString(), '100');
        assert.equal(result5.st.toString(), '300');
        const result6 = await this.archV3.getMultiplier(`${this.testStartBlock + 500}`, `${this.testStartBlock + 10600}`);
        assert.equal(result6.lpt.toString(), '0');
        assert.equal(result6.st.toString(), '100');
        const result7 = await this.archV3.getMultiplier(`${this.testStartBlock + 601}`, `${this.testStartBlock + 10601}`);
        assert.equal(result7.lpt.toString(), '0');
        assert.equal(result7.st.toString(), '0');
    });

    it('getKingPerBlock', async () => {
        assert.equal((await this.archV3.getKingPerBlock(`${this.testStartBlock + 100}`)).toString(), '6'+e18);
        assert.equal((await this.archV3.getKingPerBlock(`${this.testStartBlock + 200}`)).toString(), '6'+e18);
        assert.equal((await this.archV3.getKingPerBlock(`${this.testStartBlock + 300}`)).toString(), '6'+e18);
        assert.equal((await this.archV3.getKingPerBlock(`${this.testStartBlock + 400}`)).toString(), '6'+e18);
        assert.equal((await this.archV3.getKingPerBlock(`${this.testStartBlock + 500}`)).toString(), '1'+e18);
        assert.equal((await this.archV3.getKingPerBlock(`${this.testStartBlock + 600}`)).toString(), '1'+e18);
        assert.equal((await this.archV3.getKingPerBlock(`${this.testStartBlock + 700}`)).toString(), '0');
    });

    context('With LP pool added', () => {
        before(async () => {
            this.lp = await MockERC20.new('10000000000', { from: minter });
            this.sToken = await MockERC20.new("1000000000", { from: minter });
            await this.sToken.transfer(alice, '1000', { from: minter });
            await this.sToken.transfer(bob, '1000', { from: minter });
            await this.sToken.transfer(carol, '1000', { from: minter });
            await this.lp.transfer(alice, '1000', { from: minter });
            await this.lp.transfer(bob, '1000', { from: minter });
            await this.lp.transfer(carol, '1000', { from: minter });
            this.lp2 = await MockERC20.new('10000000000', { from: minter });
            this.sToken2 = await MockERC20.new("1000000000", { from: minter });
            await this.sToken2.transfer(alice, '1000', { from: minter });
            await this.sToken2.transfer(bob, '1000', { from: minter });
            await this.sToken2.transfer(carol, '1000', { from: minter });
            await this.lp2.transfer(alice, '1000', { from: minter });
            await this.lp2.transfer(bob, '1000', { from: minter });
            await this.lp2.transfer(carol, '1000', { from: minter });
            this.testStartBlock = parseInt(await web3.eth.getBlockNumber());
        });

        it('add pool', async () => {
            await expectRevert(this.archV3.add('100', '100', this.lp.address, this.sToken.address, false, { from: bob }), 'Ownable: caller is not the owner');
            await this.archV3.add('100', '100', this.lp.address, this.sToken.address, false);
            assert.equal((await this.archV3.poolLength()).toString(), '1');
            await expectRevert(this.archV3.add('100', '100', this.lp.address, this.sToken.address, false), 'ArchV2::add:POOL_EXISTS');
            await this.archV3.add('100', '100', this.lp2.address, this.sToken2.address, false);
            assert.equal((await this.archV3.poolLength()).toString(), '2');
        });

        it('set pool allocpoint', async () => {
            await this.archV3.add('100', '100', this.lp.address, this.sToken.address, false);
            await expectRevert(this.archV3.setAllocation(0, '200', false, { from: bob }), 'Ownable: caller is not the owner');
            await this.archV3.setAllocation(0, '200', false);
            assert.equal((await this.archV3.poolInfo('0')).allocPoint, '200');
        });

        it('set setSTokenWeight', async () => {
            await this.archV3.add('100', '100', this.lp.address, this.sToken.address, false);
            assert.equal((await this.archV3.poolInfo('0')).sTokenWeight, '100');
            await expectRevert(this.archV3.setSTokenWeight(0, '200', false, { from: bob }), 'Ownable: caller is not the owner');
            await this.archV3.setSTokenWeight(0, '200', false);
            assert.equal((await this.archV3.poolInfo('0')).sTokenWeight, '200');
        });

        it('set pool withdraw king switch', async () => {
            await this.archV3.add('100', '100', this.lp.address, this.sToken.address, false);
            assert.equal((await this.archV3.poolInfo('0')).kingLock, true);
            await expectRevert(this.archV3.setKingLock(0, false, false, { from: bob }), 'Ownable: caller is not the owner');
            await this.archV3.setKingLock(0, false, false);
            assert.equal((await this.archV3.poolInfo('0')).kingLock, false);
        });

        it('should give out $KINGs only after farming time', async () => {
            // mining from block 100, withdrawInterval 1
            const archV3 = await ArchbishopV3.new(
                this.king.address, kingServant, courtJester, `${this.testStartBlock + 100}`, '1'
            );
            await this.king._mockMint(archV3.address, '1000');
            // kingPerLptFarmingBlock 5, kingPerStFarmingBlock 10
            await archV3.setFarmingParams(
                '5', '10', `${this.testStartBlock + 150}`, `${this.testStartBlock + 150}`
            );
            // allocation 100, sTokenWeight 1e+8
            await archV3.add('100', `${1e+8}`, this.lp.address, this.sToken.address, false);

            await this.lp.approve(archV3.address, '1000', { from: bob });
            await archV3.deposit(0, '10', '0', { from: bob });
            await time.advanceBlockTo(`${this.testStartBlock + 89}`);
            await archV3.withdraw(0, '0', { from: bob }); // block 90
            assert.equal((await this.king.balanceOf(bob)).toString(), '0');
            await time.advanceBlockTo(`${this.testStartBlock + 94}`);
            await archV3.withdraw(0, '0', { from: bob }); // block 95
            assert.equal((await this.king.balanceOf(bob)).toString(), '0');
            await time.advanceBlockTo(`${this.testStartBlock + 99}`);
            assert.equal((await this.king.balanceOf(bob)).toString(), '0');
            await time.advanceBlockTo(`${this.testStartBlock + 104}`);
            assert.equal((await archV3.pendingKing(0, bob)).toString(), '60');
            await archV3.withdraw(0, '0', { from: bob }); // block 105
            assert.equal((await this.king.balanceOf(bob)).toString(), '75');
            assert.equal((await this.king.balanceOf(archV3.address)).toString(), '925');
        });

        it('should distribute $KINGs properly for each staker', async () => {
            // mining from block 0, withdrawInterval 1

            const testStartBlock = parseInt(await web3.eth.getBlockNumber()) + 3;
            const archV3 = await ArchbishopV3.new(
                this.king.address, kingServant, courtJester, `${testStartBlock}`, '1');
            await this.king._mockMint(archV3.address, '5000');
            // kingPerLptFarmingBlock 25, kingPerStFarmingBlock 0
            await archV3.setFarmingParams('25', '0', `${testStartBlock + 200}`, `${testStartBlock}`);
            // allocation 100, sTokenWeight 0
            await archV3.add('100', '0', this.lp.address, this.sToken.address, false);

            assert.equal(
                `${(await archV3.poolInfo('0')).lastRewardBlock}`, `${await web3.eth.getBlockNumber()}`
            ); // block 0

            await this.lp.approve(archV3.address, '1000', { from: alice });
            await this.lp.approve(archV3.address, '1000', { from: bob });
            await this.lp.approve(archV3.address, '1000', { from: carol });

            // Alice deposits 10 LPs at block 10
            await time.advanceBlockTo(`${testStartBlock + 9}`);
            await archV3.deposit(0, '10', '0', { from: alice });
            // Bob deposits 20 LPs at block 15
            await time.advanceBlockTo(`${testStartBlock + 14}`);
            await archV3.deposit(0, '20', '0', { from: bob });
            // Carol deposits 30 LPs at block 19
            await time.advanceBlockTo(`${testStartBlock + 18}`);
            await archV3.deposit(0, '30', '0', { from: carol });
            // Alice deposits 10 more LPs at block 22, at this point:
            // Alice should have: 5*25*10/10 + 4*25*10/30 + 3*25*10/60 = 170
            // Archbishop should have the remaining: 5000  - 170 = 4830
            await time.advanceBlockTo(`${testStartBlock + 21}`)
            await archV3.deposit(0, '10', '0', { from: alice });
            assert.equal((await this.king.balanceOf(alice)).toString(), '170');
            assert.equal((await this.king.balanceOf(bob)).toString(), '0');
            assert.equal((await this.king.balanceOf(carol)).toString(), '0');
            assert.equal((await this.king.balanceOf(archV3.address)).toString(), '4830');
            // Bob withdraws 5 LPs at block 30. At this point:
            // Bob should have: 4*25*20/30 + 3*25*20/60 + 8*25*20/70 = 148
            await time.advanceBlockTo(`${testStartBlock + 29}`)
            await archV3.withdraw(0, '5', { from: bob });
            assert.equal((await this.king.balanceOf(alice)).toString(), '170');
            assert.equal((await this.king.balanceOf(bob)).toString(), '148');
            assert.equal((await this.king.balanceOf(carol)).toString(), '0');
            assert.equal((await this.king.balanceOf(archV3.address)).toString(), '4682');
            // Alice withdraws 20 LPs at block 40
            // Bob withdraws 15 LPs at block 50
            // Carol withdraws 30 LPs at block 60
            await time.advanceBlockTo(`${testStartBlock + 39}`)
            await archV3.withdraw(0, '20', { from: alice });
            await time.advanceBlockTo(`${testStartBlock + 49}`)
            await archV3.withdraw(0, '15', { from: bob });
            await time.advanceBlockTo(`${testStartBlock + 59}`)
            await archV3.withdraw(0, '30', { from: carol });
            // Alice should have: 170 + 8*25*20/70 + 10*25*20/65 = 304
            assert.equal((await this.king.balanceOf(alice)).toString(), '304');
            // Bob should have: 148 + 10*25*15/65 + 10*25*15/45 = 289
            assert.equal((await this.king.balanceOf(bob)).toString(), '289');
            // Carol should have: 3*25*30/60 + 8*25*30/70 + 10*25*30/65 + 10*25*30/45 + 10*25*30/30 = 656
            assert.equal((await this.king.balanceOf(carol)).toString(), '656');
            // All of them should have 1000 LPs back
            assert.equal((await this.lp.balanceOf(alice)).toString(), '1000');
            assert.equal((await this.lp.balanceOf(bob)).toString(), '1000');
            assert.equal((await this.lp.balanceOf(carol)).toString(), '1000');
            assert.equal((await this.king.balanceOf(archV3.address)).toString(), '3751');
        });

        it('should give proper $KINGs allocation to each pool', async () => {
            const archV3 = await ArchbishopV3.new(
                this.king.address, kingServant, courtJester, `${this.testStartBlock + 0}`, '1');
            await this.king._mockMint(archV3.address, '5000');
            await archV3.setFarmingParams(
                '15', '10', `${this.testStartBlock + 100}`, `${this.testStartBlock + 100}`);
            await this.lp.approve(archV3.address, '1000', { from: alice });
            await this.lp2.approve(archV3.address, '1000', { from: bob });
            // Add first LP to the pool with allocation 10
            await archV3.add('10', '100', this.lp.address, this.sToken.address, true);
            // Alice deposits 10 LPs at block 10
            await time.advanceBlockTo(`${this.testStartBlock + 9}`);
            await archV3.deposit(0, '10', '0', { from: alice });
            // Add LP2 to the pool with allocation 2 at block 20
            await time.advanceBlockTo(`${this.testStartBlock + 19}`);
            await archV3.add('20', '100',this.lp2.address, this.sToken2.address, true);
            // Alice should have 10*25 pending reward
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '250');
            // Bob deposits 10 LP2s at block 25
            await time.advanceBlockTo(`${this.testStartBlock + 24}`);
            await archV3.deposit(1, '10', '0', { from: bob });
            // Alice should have 250 + 5*1/3*25 = 291 pending reward
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '291');
            await time.advanceBlockTo(`${this.testStartBlock + 30}`);
            // At block 30. Bob should get 5*2/3*25 = 83. Alice should get ~41 more.
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '333');
            assert.equal((await archV3.pendingKing(1, bob)).toString(), '83');
        });

        it('should stop giving bonus $KINGs after the bonus period ends', async () => {
            const archV3 = await ArchbishopV3.new(
                this.king.address, kingServant, courtJester, `${this.testStartBlock + 0}`, '1');
            await this.king._mockMint(archV3.address, '5000');
            await archV3.setFarmingParams(
                '5', '20', `${this.testStartBlock + 100}`, `${this.testStartBlock + 100}`);
            await this.lp.approve(archV3.address, '1000', { from: alice });
            await archV3.add('1', '100', this.lp.address, this.sToken.address, true);
            // Alice deposits 10 LPs at block 90
            await time.advanceBlockTo(`${this.testStartBlock + 89}`);
            await archV3.deposit(0, '10', '0', { from: alice });
            // At block 110, she should have 25*10 = 250 pending.
            await time.advanceBlockTo(`${this.testStartBlock + 109}`);
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '250');
        });

        it('can not harvest king if harvest interval less than withdraw interval', async () => {
            const archV3 = await ArchbishopV3.new(
                this.king.address, kingServant, courtJester, `${this.testStartBlock + 0}`, '100');
            await this.king._mockMint(archV3.address, '5000');
            await archV3.setFarmingParams(
                '18', '7', `${this.testStartBlock + 150}`, `${this.testStartBlock + 150}`);
            await this.lp.approve(archV3.address, '1000', { from: alice });
            await archV3.add('1', '100', this.lp.address, this.sToken.address, true);
            // Alice deposits 10 LPs at block 40
            await time.advanceBlockTo(`${this.testStartBlock + 39}`);
            await archV3.deposit(0, '10', '0', { from: alice });//40
            await time.advanceBlockTo(`${this.testStartBlock + 50}`);
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '250');
            await archV3.withdraw(0, '0', { from: alice });//51
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '275');
            assert.equal((await this.king.balanceOf(alice)).toString(), '0');
            await archV3.withdraw(0, '5', { from: alice });//52
            assert.equal((await this.king.balanceOf(alice)).toString(), '0');
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '300');
            await archV3.setWithdrawInterval('1');//53
            await archV3.withdraw(0, '0', { from: alice });//54
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '0');
            assert.equal((await this.king.balanceOf(alice)).toString(), '350');
            await time.advanceBlockTo(`${this.testStartBlock + 59}`);
            await archV3.withdraw(0, '5', { from: alice });//60
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '0');
            assert.equal((await this.king.balanceOf(alice)).toString(), '500');
        });

        it('lp fee ratio', async () => {
            const archV3 = await ArchbishopV3.new(
                this.king.address, kingServant, courtJester, `${this.testStartBlock + 0}`, '1'
            );
            await this.king._mockMint(archV3.address, '5000');
            await archV3.setFarmingParams(
                '18', '7', `${this.testStartBlock + 150}`, `${this.testStartBlock + 150}`);
            const lp = await MockERC20.new('400000000000000000000', { from: minter });
            await lp.transfer(alice, '200000000000000000000', { from: minter });
            await lp.transfer(bob, '200000000000000000000', { from: minter });
            await this.king._mockMint(archV3.address, '5000');
            await lp.approve(archV3.address, '200000000000000000000', { from: alice });
            await lp.approve(archV3.address, '200000000000000000000', { from: bob });
            await archV3.add('1', '100', lp.address, this.sToken.address, true);
            // Alice deposits 10 LPs at block 40
            await time.advanceBlockTo(`${this.testStartBlock + 39}`);
            await archV3.deposit(0, '200000000000000000000', '0', { from: alice });//40
            await archV3.deposit(0, '200000000000000000000', '0', { from: bob });//41
            await time.advanceBlockTo(`${this.testStartBlock + 49}`);
            await archV3.withdraw(0, '5000000000000000000', { from: alice });
            assert.equal((await lp.balanceOf(alice)).toString(), '5000000000000000000');
            await archV3.setLpFeePct(5);
            await archV3.withdraw(0, '5000000000000000000', { from: alice });
            assert.equal((await lp.balanceOf(alice)).toString(), '9750000000000000000');
            assert.equal((await lp.balanceOf(archV3.address)).toString(), '390000000000000000000');
            assert.equal((await lp.balanceOf(kingServant)).toString(), '250000000000000000');
            await archV3.withdraw(0, '5000000000000000000', { from: bob });
            assert.equal((await lp.balanceOf(bob)).toString(), '4750000000000000000');
            assert.equal((await lp.balanceOf(kingServant)).toString(), '500000000000000000');
        });

        it('king fee ratio', async () => {
            const archV3 = await ArchbishopV3.new(
                this.king.address, kingServant, courtJester, `${this.testStartBlock + 50}`, '100');
            await this.king._mockMint(archV3.address, '5000');
            await archV3.setFarmingParams(
                '24', '1', `${this.testStartBlock + 150}`, `${this.testStartBlock + 150}`);
            await archV3.setKingFeePct(10)
            await this.lp.approve(archV3.address, '1000', { from: alice });
            await archV3.add('1', '100', this.lp.address, this.sToken.address, true);
            // Alice deposits 10 LPs at block 90
            await time.advanceBlockTo(`${this.testStartBlock + 89}`);
            await archV3.deposit(0, '10', '0', { from: alice });//90
            await time.advanceBlockTo(`${this.testStartBlock + 100}`);
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '250');
            await archV3.withdraw(0, '0', { from: alice });//101
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '275');
            assert.equal((await this.king.balanceOf(alice)).toString(), '0');
            await archV3.withdraw(0, '5', { from: alice });//102
            assert.equal((await this.king.balanceOf(alice)).toString(), '0');
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '300');
            await archV3.setKingLock(0, false, false);
            await archV3.withdraw(0, '0', { from: alice });//104
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '0');
            assert.equal((await this.king.balanceOf(alice)).toString(), '315');
            await time.advanceBlockTo(`${this.testStartBlock + 109}`);
            await archV3.withdraw(0, '5', { from: alice });//110
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '0');
            assert.equal((await this.king.balanceOf(alice)).toString(), '450');
            assert.equal((await this.king.balanceOf(courtJester)).toString(), '50');
        });

        it('withdraw', async () => {
            const archV3 = await ArchbishopV3.new(
                this.king.address, kingServant, courtJester, `${this.testStartBlock + 0}`, '200');
            await this.king._mockMint(archV3.address, '5000');
            await archV3.setFarmingParams(
                '15', '10', `${this.testStartBlock + 200}`,`${this.testStartBlock + 200}`);
            await this.lp.approve(archV3.address, '1000', { from: alice });
            await this.sToken.approve(archV3.address, '1000', { from: alice });
            await this.lp.approve(archV3.address, '1000', { from: bob });
            await this.sToken.approve(archV3.address, '1000', { from: bob });
            await archV3.add('100', '1000000000', this.lp.address, this.sToken.address, true);
            await time.advanceBlockTo(`${this.testStartBlock + 98}`);
            await expectRevert(archV3.deposit(0, '0', '1', { from: alice }), 'deposit: zero LP token amount');
            await archV3.deposit(0, '1000', '10', { from: alice });//100
            assert.equal((await archV3.userInfo(0, alice)).wAmount.toString(), '1100');
            assert.equal((await archV3.userInfo(0, alice)).lptAmount.toString(), '1000');
            assert.equal((await archV3.userInfo(0, alice)).stAmount.toString(), '10');
            await time.advanceBlockTo(`${this.testStartBlock + 109}`);
            await archV3.deposit(0, '1000', '10', { from: bob });//110
            assert.equal((await archV3.userInfo(0, bob)).wAmount.toString(), '1100');
            assert.equal((await archV3.userInfo(0, bob)).lptAmount.toString(), '1000');
            assert.equal((await archV3.userInfo(0, bob)).stAmount.toString(), '10');
            await time.advanceBlockTo(`${this.testStartBlock + 119}`);
            await archV3.withdraw(0, '500', { from: alice });//120
            // alice have king = (1100/1100)*10*25+(1100/2200)*10*25 = 375
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '374');
            assert.equal((await archV3.pendingKing(0, bob)).toString(), '125');
            assert.equal((await this.lp.balanceOf(alice)).toString(), '500');
            assert.equal((await this.sToken.balanceOf(alice)).toString(), '990');
            assert.equal((await archV3.userInfo(0, alice)).stAmount.toString(), '0');
            assert.equal((await archV3.userInfo(0, alice)).lptAmount.toString(), '500');
            assert.equal((await archV3.userInfo(0, alice)).wAmount.toString(), '500');
            assert.equal((await this.lp.balanceOf(archV3.address)).toString(), '1500');
            assert.equal((await this.sToken.balanceOf(archV3.address)).toString(), '10');
            await time.advanceBlockTo(`${this.testStartBlock + 129}`);
            await archV3.withdraw(0, '500', { from: bob });//130
            // bob have king = (1100/2200)*10*25 + (1100/1600)*10*25= 297
            assert.equal((await archV3.pendingKing(0, bob)).toString(), '297');
            assert.equal((await this.lp.balanceOf(bob)).toString(), '500');
            assert.equal((await this.sToken.balanceOf(bob)).toString(), '990');
            assert.equal((await archV3.userInfo(0, bob)).stAmount.toString(), '0');
            assert.equal((await archV3.userInfo(0, bob)).lptAmount.toString(), '500');
            assert.equal((await archV3.userInfo(0, bob)).wAmount.toString(), '500');
            assert.equal((await this.lp.balanceOf(archV3.address)).toString(), '1000');
            assert.equal((await this.sToken.balanceOf(archV3.address)).toString(), '0');
        });

        it('emergency withdraw', async () => {
            const archV3 = await ArchbishopV3.new(
                this.king.address, kingServant, courtJester, `${this.testStartBlock + 100}`, '1');
            await this.king._mockMint(archV3.address, '5000');
            await archV3.setFarmingParams(
                '5', '10', `${this.testStartBlock + 200}`, `${this.testStartBlock + 200}`);
            await this.lp.approve(archV3.address, '1000', { from: alice });
            await this.sToken.approve(archV3.address, '1000', { from: alice });
            await this.lp.approve(archV3.address, '1000', { from: bob });
            await this.sToken.approve(archV3.address, '1000', { from: bob });
            await archV3.add('100', '1000000000', this.lp.address, this.sToken.address, true);
            await expectRevert(archV3.emergencyWithdraw(0, { from: alice }), 'withdraw: zero LP token amount');
            await archV3.deposit(0, '1000', '10', { from: alice });
            await time.advanceBlockTo(`${this.testStartBlock + 160}`);
            await archV3.emergencyWithdraw(0, { from: alice })
            assert.equal((await archV3.pendingKing(0, alice)).toString(), '0');
            assert.equal((await this.lp.balanceOf(alice)).toString(), '1000');
            assert.equal((await this.sToken.balanceOf(alice)).toString(), '990');
            assert.equal((await archV3.userInfo(0, alice)).wAmount.toString(), '0');
            assert.equal((await archV3.userInfo(0, alice)).stAmount.toString(), '0');
            assert.equal((await archV3.userInfo(0, alice)).lptAmount.toString(), '0');
        });

        context('Meta-transactions', () => {
            const carolPrivKey = '6b9e71ba9d19287ccc998fdbb43ad4ab0c213a6acfe16b358bf7555bf8080380';

            before(async() => {
                expect(carol.toLowerCase(), 'private key does not match')
                    .to.be.eq(web3.eth.accounts.privateKeyToAccount(carolPrivKey).address.toLowerCase());

                const lp = await MockERC20.new('1005', { from: minter });
                await lp.transfer(carol, '1003', { from: minter });
                await lp.approve(this.archV3.address, '1003', { from: carol });

                const sToken = await MockERC20.new("105", { from: minter });
                await sToken.transfer(carol, '102', { from: minter });
                await sToken.approve(this.archV3.address, '102', { from: carol });

                await this.archV3.add('100', '500', lp.address, sToken.address, true);
            });

            it('DOMAIN_SEPARATOR', async () => {
                expect(await this.archV3.DOMAIN_SEPARATOR()).to.be.eq(domainSeparator);
            })

            it('depositBySig', async () => {
                const DEPOSIT_TYPEHASH = keccak256(
                    "Deposit(address user,uint256 pid,uint256 lptAmount,uint256 stAmount,uint256 nonce,uint256 deadline)"
                );
                const nonce = (await this.archV3.nonces(carol)).toString();
                const deadline = `${100 + (await time.latest())}`;

                const message = '0x' + [
                    '0x1901',
                    domainSeparator,
                    keccak256(
                        abi.encodeParameters(
                            ['bytes32', 'address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
                            [DEPOSIT_TYPEHASH, carol, '0', '1003', '102', nonce, deadline]
                        )
                    )
                ].map( s => s.replace('0x', '')).join('');
                const digest = keccak256(message);

                const { v, r, s } = ecsign(
                    Buffer.from(digest.replace('0x', ''), 'hex'),
                    Buffer.from(carolPrivKey.replace('0x', ''), 'hex')
                );

                await this.archV3.depositBySig(carol, '0', '1003', '102', deadline, v, r, s, { from: bob });

                assert.equal((await this.archV3.userInfo(0, carol)).lptAmount.toString(), '1003');
                assert.equal((await this.archV3.userInfo(0, carol)).stAmount.toString(), '102');
            })

            it('withdrawBySig', async () => {
                await this.archV3.deposit('0', '1003', '102', { from: carol });
                assert.equal((await this.archV3.userInfo(0, carol)).lptAmount.toString(), '1003');

                const WITHDRAW_TYPEHASH = keccak256(
                    "Withdraw(address user,uint256 pid,uint256 lptAmount,uint256 nonce,uint256 deadline)"
                );
                const nonce = (await this.archV3.nonces(carol)).toString();
                const deadline = `${100 + (await time.latest())}`;

                const message = '0x' + [
                    '0x1901',
                    domainSeparator,
                    keccak256(
                        abi.encodeParameters(
                            ['bytes32', 'address', 'uint256', 'uint256', 'uint256', 'uint256'],
                            [WITHDRAW_TYPEHASH, carol, '0', '502', nonce, deadline]
                        )
                    )
                ].map( s => s.replace('0x', '')).join('');
                const digest = keccak256(message)

                const { v, r, s } = ecsign(
                    Buffer.from(digest.replace('0x', ''), 'hex'),
                    Buffer.from(carolPrivKey.replace('0x', ''), 'hex')
                );

                await this.archV3.withdrawBySig(carol, '0', '502', deadline, v, r, s, { from: bob });

                assert.equal((await this.archV3.userInfo(0, carol)).lptAmount.toString(), '501');
                assert.equal((await this.archV3.userInfo(0, carol)).stAmount.toString(), '0');
            })
        });
    });
});
