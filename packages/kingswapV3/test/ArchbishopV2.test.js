const { expectRevert, time } = require('@openzeppelin/test-helpers');
const KingToken = artifacts.require('KingToken');
const ArchbishopV2 = artifacts.require('ArchbishopV2');
const MockERC20 = artifacts.require('MockERC20');

contract('ArchbishopV2', ([alice, bob, carol, courtJester, kingServant, minter]) => {
    const e18 = '000000000000000000';

    beforeEach(async () => {
        this.king = await KingToken.new({ from: alice });
        this.testStartBlock = parseInt(await web3.eth.getBlockNumber());

        this.archV2 = await ArchbishopV2.new(
            this.king.address,
            kingServant,
            courtJester,
            `${this.testStartBlock}`,
            '100', // _withdrawInterval
            { from: alice }
        );

        await this.king.mint(this.archV2.address, '5000'+e18);
        await this.archV2.setFarmingParams(
            '5'+e18, // _kingPerLptFarmingBlock
            '1'+e18, // _kingPerStFarmingBlock
            `${this.testStartBlock + 400}`, // lptFarmingBlocks
            `${this.testStartBlock + 600}`, // stFarmingBlocks
            { from: alice }
        );
    });

    it('should set correct state variables', async () => {
        const king = await this.archV2.king();
        const owner = await this.archV2.owner();
        const startBlock = await this.archV2.startBlock();
        const kingPerLptFarmingBlock = await this.archV2.kingPerLptFarmingBlock();
        const kingPerStFarmingBlock = await this.archV2.kingPerStFarmingBlock();
        const lptFarmingEndBlock = await this.archV2.lptFarmingEndBlock();
        const stFarmingEndBlock = await this.archV2.stFarmingEndBlock();
        assert.equal(king.toString(), this.king.address);
        assert.equal(owner.toString(), alice);
        assert.equal(startBlock.toString(), `${this.testStartBlock}`);
        assert.equal(kingPerLptFarmingBlock.toString(), '5000000000000000000');
        assert.equal(kingPerStFarmingBlock.toString(), '1000000000000000000');
        assert.equal(lptFarmingEndBlock.toString(), `${this.testStartBlock + 400}`);
        assert.equal(stFarmingEndBlock.toString(), `${this.testStartBlock + 600}`);
    });

    it('should allow owner and only owner to update king Fee Address', async () => {
        assert.equal((await this.archV2.courtJester()).valueOf(), courtJester);
        await expectRevert(this.archV2.setCourtJester(bob, { from: carol }), 'Ownable: caller is not the owner');
        await this.archV2.setCourtJester(bob, { from: alice });
        assert.equal((await this.archV2.courtJester()).valueOf(), bob);
    });

    it('should allow owner and only owner to update kingServant', async () => {
        assert.equal((await this.archV2.kingServant()).valueOf(), kingServant);
        await expectRevert(this.archV2.setKingServant(bob, { from: carol }), 'Ownable: caller is not the owner');
        await this.archV2.setKingServant(bob, { from: alice });
        assert.equal((await this.archV2.kingServant()).valueOf(), bob);
    });

    it('should allow owner and only owner to update LP fee percent', async () => {
        assert.equal((await this.archV2.lpFeePct()).valueOf(), '0');
        await expectRevert(this.archV2.setLpFeePct('10', { from: carol }), 'Ownable: caller is not the owner');
        await expectRevert(this.archV2.setLpFeePct('200', { from: alice }), 'ArchV2::INVALID_PERCENT');
        await this.archV2.setLpFeePct('10', { from: alice });
        assert.equal((await this.archV2.lpFeePct()).valueOf(), '10');
    });

    it('should allow owner and only owner to update withdrawInterval', async () => {
        assert.equal((await this.archV2.withdrawInterval()).valueOf(), '100');
        await expectRevert(this.archV2.setWithdrawInterval('10', { from: carol }), 'Ownable: caller is not the owner');
        await this.archV2.setWithdrawInterval('1000', { from: alice });
        assert.equal((await this.archV2.withdrawInterval()).valueOf(), '1000');
    });

    it('should allow owner and only owner to update king fee percent', async () => {
        assert.equal((await this.archV2.kingFeePct()).valueOf(), '0');
        await expectRevert(this.archV2.setKingFeePct('20', { from: carol }), 'Ownable: caller is not the owner');
        await expectRevert(this.archV2.setKingFeePct('200', { from: alice }), 'ArchV2::INVALID_PERCENT');
        await this.archV2.setKingFeePct('20', { from: alice });
        assert.equal((await this.archV2.kingFeePct()).valueOf(), '20');
    });

    context('With enough $KING balance for distribution between farmers', () => {
        it('should allow owner and only owner to update farming params', async () => {
            await expectRevert(this.archV2.setFarmingParams(
                '3'+e18, // _kingPerLptFarmingBlock
                '2'+e18, // _kingPerStFarmingBlock
                `${this.testStartBlock + 1000}`, // lptFarmingBlocks
                `${this.testStartBlock + 1000}`, // stFarmingBlocks
                { from: bob }
            ), 'Ownable: caller is not the owner');
            // KING$ balance is '5000'+e18
            await this.archV2.setFarmingParams(
                '3'+e18, // _kingPerLptFarmingBlock
                '2'+e18, // _kingPerStFarmingBlock
                `${this.testStartBlock + 1000}`, // lptFarmingBlocks
                `${this.testStartBlock + 1000}`, // stFarmingBlocks
                { from: alice }
            );
            assert.equal((await this.archV2.kingPerLptFarmingBlock()).toString(), '3000000000000000000');
            assert.equal((await this.archV2.kingPerStFarmingBlock()).toString(), '2000000000000000000');
            assert.equal((await this.archV2.lptFarmingEndBlock()).toString(), `${this.testStartBlock + 1000}`);
            assert.equal((await this.archV2.stFarmingEndBlock()).toString(), `${this.testStartBlock + 1000}`);
        });
    });

    context('With the $KING balance not enough', () => {
        it('should revert on owner\' update of farming params', async () => {
            // KING$ balance is '5000'+e18
            await expectRevert(this.archV2.setFarmingParams(
                '3'+e18, // _kingPerLptFarmingBlock
                '2'+e18, // _kingPerStFarmingBlock
                `${this.testStartBlock + 2000}`, // lptFarmingBlocks
                `${this.testStartBlock + 2000}`, // stFarmingBlocks
                { from: alice }
            ), 'ArchV2::LOW_$KING_BALANCE');
        });
    });

    it('getMultiplier', async () => {
        const result1 = await this.archV2.getMultiplier(`${this.testStartBlock}`, `${this.testStartBlock + 1}`);
        assert.equal(result1.lpt.valueOf(), '1');
        assert.equal(result1.st.valueOf(), '1');
        const result2 = await this.archV2.getMultiplier(`${this.testStartBlock}`, `${this.testStartBlock + 400}`);
        assert.equal(result2.lpt.valueOf(), '400');
        assert.equal(result2.st.valueOf(), '400');
        const result3 = await this.archV2.getMultiplier(`${this.testStartBlock}`, `${this.testStartBlock + 600}`);
        assert.equal(result3.lpt.valueOf(), '400');
        assert.equal(result3.st.valueOf(), '600');
        const result4 = await this.archV2.getMultiplier(`${this.testStartBlock}`, `${this.testStartBlock + 800}`);
        assert.equal(result4.lpt.valueOf(), '400');
        assert.equal(result4.st.valueOf(), '600');
        const result5 = await this.archV2.getMultiplier(`${this.testStartBlock + 300}`, `${this.testStartBlock + 800}`);
        assert.equal(result5.lpt.valueOf(), '100');
        assert.equal(result5.st.valueOf(), '300');
        const result6 = await this.archV2.getMultiplier(`${this.testStartBlock + 500}`, `${this.testStartBlock + 10600}`);
        assert.equal(result6.lpt.valueOf(), '0');
        assert.equal(result6.st.valueOf(), '100');
        const result7 = await this.archV2.getMultiplier(`${this.testStartBlock + 601}`, `${this.testStartBlock + 10601}`);
        assert.equal(result7.lpt.valueOf(), '0');
        assert.equal(result7.st.valueOf(), '0');
    });

    it('getKingPerBlock', async () => {
        assert.equal(await this.archV2.getKingPerBlock(`${this.testStartBlock + 100}`).valueOf(), '6'+e18);
        assert.equal(await this.archV2.getKingPerBlock(`${this.testStartBlock + 200}`).valueOf(), '6'+e18);
        assert.equal(await this.archV2.getKingPerBlock(`${this.testStartBlock + 300}`).valueOf(), '6'+e18);
        assert.equal(await this.archV2.getKingPerBlock(`${this.testStartBlock + 400}`).valueOf(), '6'+e18);
        assert.equal(await this.archV2.getKingPerBlock(`${this.testStartBlock + 500}`).valueOf(), '1'+e18);
        assert.equal(await this.archV2.getKingPerBlock(`${this.testStartBlock + 600}`).valueOf(), '1'+e18);
        assert.equal(await this.archV2.getKingPerBlock(`${this.testStartBlock + 700}`).valueOf(), '0');
    });

    context('With LP pool added', () => {
        beforeEach(async () => {
            this.lp = await MockERC20.new('LPToken', 'LP', '10000000000', { from: minter });
            this.sToken = await MockERC20.new("KingSwap Slippage Token", "SST", "1000000000", { from: minter });
            await this.sToken.transfer(alice, '1000', { from: minter });
            await this.sToken.transfer(bob, '1000', { from: minter });
            await this.sToken.transfer(carol, '1000', { from: minter });
            await this.lp.transfer(alice, '1000', { from: minter });
            await this.lp.transfer(bob, '1000', { from: minter });
            await this.lp.transfer(carol, '1000', { from: minter });
            this.lp2 = await MockERC20.new('LPToken2', 'LP2', '10000000000', { from: minter });
            this.sToken2 = await MockERC20.new("KingSwap Slippage Token", "SST", "1000000000", { from: minter });
            await this.sToken2.transfer(alice, '1000', { from: minter });
            await this.sToken2.transfer(bob, '1000', { from: minter });
            await this.sToken2.transfer(carol, '1000', { from: minter });
            await this.lp2.transfer(alice, '1000', { from: minter });
            await this.lp2.transfer(bob, '1000', { from: minter });
            await this.lp2.transfer(carol, '1000', { from: minter });
        });

        it('add pool', async () => {
            await expectRevert(this.archV2.add('100', '100', this.lp.address, this.sToken.address, false, { from: bob }), 'Ownable: caller is not the owner');
            await this.archV2.add('100', '100', this.lp.address, this.sToken.address, false, { from: alice });
            assert.equal((await this.archV2.poolLength()).valueOf(), '1');
            await expectRevert(this.archV2.add('100', '100', this.lp.address, this.sToken.address, false, { from: alice }), 'ArchV2::add:POOL_EXISTS');
            await this.archV2.add('100', '100', this.lp2.address, this.sToken2.address, false, { from: alice });
            assert.equal((await this.archV2.poolLength()).valueOf(), '2');
        });

        it('set pool allocpoint', async () => {
            await this.archV2.add('100', '100', this.lp.address, this.sToken.address, false, { from: alice });
            await expectRevert(this.archV2.setAllocation(0, '200', false, { from: bob }), 'Ownable: caller is not the owner');
            await this.archV2.setAllocation(0, '200', false, { from: alice });
            assert.equal((await this.archV2.poolInfo('0')).allocPoint, '200');
        });

        it('set setSTokenWeight', async () => {
            await this.archV2.add('100', '100', this.lp.address, this.sToken.address, false, { from: alice });
            assert.equal((await this.archV2.poolInfo('0')).sTokenWeight, '100');
            await expectRevert(this.archV2.setSTokenWeight(0, '200', false, { from: bob }), 'Ownable: caller is not the owner');
            await this.archV2.setSTokenWeight(0, '200', false, { from: alice });
            assert.equal((await this.archV2.poolInfo('0')).sTokenWeight, '200');
        });

        it('set pool withdraw king switch', async () => {
            await this.archV2.add('100', '100', this.lp.address, this.sToken.address, false, { from: alice });
            assert.equal((await this.archV2.poolInfo('0')).kingLock, true);
            await expectRevert(this.archV2.setKingLock(0, false, false, { from: bob }), 'Ownable: caller is not the owner');
            await this.archV2.setKingLock(0, false, false, { from: alice });
            assert.equal((await this.archV2.poolInfo('0')).kingLock, false);
        });

        it('should give out $KINGs only after farming time', async () => {
            // mining from block 100, withdrawInterval 1
            const archV2 = await ArchbishopV2.new(
                this.king.address, kingServant, courtJester, `${this.testStartBlock + 100}`, '1', { from: alice }
            );
            await this.king.mint(archV2.address, '1000');
            // kingPerLptFarmingBlock 5, kingPerStFarmingBlock 10
            await archV2.setFarmingParams(
                '5', '10', `${this.testStartBlock + 150}`, `${this.testStartBlock + 150}`
            );
            // allocation 100, sTokenWeight 1e+8
            await archV2.add('100', `${1e+8}`, this.lp.address, this.sToken.address, false, { from: alice });

            await this.lp.approve(archV2.address, '1000', { from: bob });
            await archV2.deposit(0, '10', '0', { from: bob });
            await time.advanceBlockTo(`${this.testStartBlock + 89}`);
            await archV2.withdraw(0, '0', { from: bob }); // block 90
            assert.equal((await this.king.balanceOf(bob)).valueOf(), '0');
            await time.advanceBlockTo(`${this.testStartBlock + 94}`);
            await archV2.withdraw(0, '0', { from: bob }); // block 95
            assert.equal((await this.king.balanceOf(bob)).valueOf(), '0');
            await time.advanceBlockTo(`${this.testStartBlock + 99}`);
            assert.equal((await this.king.balanceOf(bob)).valueOf(), '0');
            await time.advanceBlockTo(`${this.testStartBlock + 104}`);
            assert.equal((await archV2.pendingKing(0, bob)).valueOf(), '60');
            await archV2.withdraw(0, '0', { from: bob }); // block 105
            assert.equal((await this.king.balanceOf(bob)).valueOf(), '75');
            assert.equal((await this.king.balanceOf(archV2.address)).valueOf(), '925');
        });

        it('should distribute $KINGs properly for each staker', async () => {
            // mining from block 0, withdrawInterval 1

            const testStartBlock = parseInt(await web3.eth.getBlockNumber()) + 3;
            const archV2 = await ArchbishopV2.new(
                this.king.address, kingServant, courtJester, `${testStartBlock}`, '1', { from: alice }
            );
            await this.king.mint(archV2.address, '5000');
            // kingPerLptFarmingBlock 25, kingPerStFarmingBlock 0
            await archV2.setFarmingParams(
                '25', '0', `${testStartBlock + 200}`, `${testStartBlock}`
            );
            // allocation 100, sTokenWeight 0
            await archV2.add('100', '0', this.lp.address, this.sToken.address, false, { from: alice });

            assert.equal(
                `${(await archV2.poolInfo('0')).lastRewardBlock}`, `${await web3.eth.getBlockNumber()}`
            ); // block 0

            await this.lp.approve(archV2.address, '1000', { from: alice });
            await this.lp.approve(archV2.address, '1000', { from: bob });
            await this.lp.approve(archV2.address, '1000', { from: carol });

            // Alice deposits 10 LPs at block 10
            await time.advanceBlockTo(`${testStartBlock + 9}`);
            await archV2.deposit(0, '10', '0', { from: alice });
            // Bob deposits 20 LPs at block 15
            await time.advanceBlockTo(`${testStartBlock + 14}`);
            await archV2.deposit(0, '20', '0', { from: bob });
            // Carol deposits 30 LPs at block 19
            await time.advanceBlockTo(`${testStartBlock + 18}`);
            await archV2.deposit(0, '30', '0', { from: carol });
            // Alice deposits 10 more LPs at block 22, at this point:
            // Alice should have: 5*25*10/10 + 4*25*10/30 + 3*25*10/60 = 170
            // Archbishop should have the remaining: 5000  - 170 = 4830
            await time.advanceBlockTo(`${testStartBlock + 21}`)
            await archV2.deposit(0, '10', '0', { from: alice });
            assert.equal((await this.king.balanceOf(alice)).valueOf(), '170');
            assert.equal((await this.king.balanceOf(bob)).valueOf(), '0');
            assert.equal((await this.king.balanceOf(carol)).valueOf(), '0');
            assert.equal((await this.king.balanceOf(archV2.address)).valueOf(), '4830');
            // Bob withdraws 5 LPs at block 30. At this point:
            // Bob should have: 4*25*20/30 + 3*25*20/60 + 8*25*20/70 = 148
            await time.advanceBlockTo(`${testStartBlock + 29}`)
            await archV2.withdraw(0, '5', { from: bob });
            assert.equal((await this.king.balanceOf(alice)).valueOf(), '170');
            assert.equal((await this.king.balanceOf(bob)).valueOf(), '148');
            assert.equal((await this.king.balanceOf(carol)).valueOf(), '0');
            assert.equal((await this.king.balanceOf(archV2.address)).valueOf(), '4682');
            // Alice withdraws 20 LPs at block 40
            // Bob withdraws 15 LPs at block 50
            // Carol withdraws 30 LPs at block 60
            await time.advanceBlockTo(`${testStartBlock + 39}`)
            await archV2.withdraw(0, '20', { from: alice });
            await time.advanceBlockTo(`${testStartBlock + 49}`)
            await archV2.withdraw(0, '15', { from: bob });
            await time.advanceBlockTo(`${testStartBlock + 59}`)
            await archV2.withdraw(0, '30', { from: carol });
            // Alice should have: 170 + 8*25*20/70 + 10*25*20/65 = 304
            assert.equal((await this.king.balanceOf(alice)).valueOf(), '304');
            // Bob should have: 148 + 10*25*15/65 + 10*25*15/45 = 289
            assert.equal((await this.king.balanceOf(bob)).valueOf(), '289');
            // Carol should have: 3*25*30/60 + 8*25*30/70 + 10*25*30/65 + 10*25*30/45 + 10*25*30/30 = 656
            assert.equal((await this.king.balanceOf(carol)).valueOf(), '656');
            // All of them should have 1000 LPs back
            assert.equal((await this.lp.balanceOf(alice)).valueOf(), '1000');
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '1000');
            assert.equal((await this.lp.balanceOf(carol)).valueOf(), '1000');
            assert.equal((await this.king.balanceOf(archV2.address)).valueOf(), '3751');
        });

        xit('should give proper $KINGs allocation to each pool', async () => {
            const archV2 = await ArchbishopV2.new(this.king.address, kingServant, courtJester, `${this.testStartBlock + 400}`, { from: alice });
            await this.king.mint(archV2.address, '5000');
            await archV2.setKingPerLptFarmingBlock('5', false,{ from: alice });
            await archV2.setKingPerStFarmingBlock('10', false,{ from: alice });
            await this.lp.approve(archV2.address, '1000', { from: alice });
            await this.lp2.approve(archV2.address, '1000', { from: bob });
            // Add first LP to the pool with allocation 10
            await archV2.add('10', '100', this.lp.address, this.sToken.address, true, { from: alice });
            // Alice deposits 10 LPs at block 410
            await time.advanceBlockTo(`${this.testStartBlock + 409}`);
            await archV2.deposit(0, '10', '0', { from: alice });
            // Add LP2 to the pool with allocation 2 at block 320
            await time.advanceBlockTo(`${this.testStartBlock + 419}`);
            await archV2.add('20', '100',this.lp2.address, this.sToken2.address, true, { from: alice });
            // Alice should have 10*25 pending reward
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '250');
            // Bob deposits 10 LP2s at block 325
            await time.advanceBlockTo(`${this.testStartBlock + 424}`);
            await archV2.deposit(1, '10', '0', { from: bob });
            // Alice should have 250 + 5*1/3*25 = 291 pending reward
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '291');
            await time.advanceBlockTo(`${this.testStartBlock + 430}`);
            // At block 330. Bob should get 5*2/3*25 = 82. Alice should get ~41 more.
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '332');
            assert.equal((await archV2.pendingKing(1, bob)).valueOf(), '82');
        });

        xit('xshould stop giving bonus $KINGs after the bonus period ends', async () => {
            const archV2 = await ArchbishopV2.new(this.king.address, kingServant, courtJester, `${this.testStartBlock + 500}`, { from: alice });
            await this.king.mint(archV2.address, '5000');
            await archV2.setKingPerLptFarmingBlock('5', false,{ from: alice });
            await archV2.setKingPerStFarmingBlock('10', false,{ from: alice });
            await this.lp.approve(archV2.address, '1000', { from: alice });
            await archV2.add('1', '100', this.lp.address, this.sToken.address, true, { from: alice });
            await archV2.setstFarmingEndBlock(`${this.testStartBlock + 600}`, { from: alice });
            await archV2.setlptFarmingEndBlock(`${this.testStartBlock + 600}`, { from: alice });
            // Alice deposits 10 LPs at block 590
            await time.advanceBlockTo(`${this.testStartBlock + 589}`);
            await archV2.deposit(0, '10', '0', { from: alice });
            // At block 605, she should have 25*10 = 250 pending.
            await time.advanceBlockTo(`${this.testStartBlock + 610}`);
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '250');
        });

        xit('can not harvest king if harvest interval less than withdraw interval', async () => {
            const archV2 = await ArchbishopV2.new(this.king.address, kingServant, courtJester, `${this.testStartBlock + 650}`, { from: alice });
            await this.king.mint(archV2.address, '5000');
            await archV2.setKingPerLptFarmingBlock('5', false,{ from: alice });
            await archV2.setKingPerStFarmingBlock('10', false,{ from: alice });
            await this.lp.approve(archV2.address, '1000', { from: alice });
            await archV2.add('1', '100', this.lp.address, this.sToken.address, true, { from: alice });
            // Alice deposits 10 LPs at block 690
            await time.advanceBlockTo(`${this.testStartBlock + 689}`);
            await archV2.deposit(0, '10', '0', { from: alice });//590
            await time.advanceBlockTo(`${this.testStartBlock + 700}`);
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '250');
            await archV2.deposit(0, '0', '0', { from: alice });//601
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '275');
            assert.equal((await this.king.balanceOf(alice)).valueOf(), '0');
            await archV2.withdraw(0, '5', { from: alice });//602
            assert.equal((await this.king.balanceOf(alice)).valueOf(), '0');
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '300');
            await archV2.setWithdrawInterval('1', { from: alice });//603
            await archV2.deposit(0, '0', '0', { from: alice });//604
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '0');
            assert.equal((await this.king.balanceOf(alice)).valueOf(), '350');
            await time.advanceBlockTo(`${this.testStartBlock + 709}`);
            await archV2.withdraw(0, '5', { from: alice });//610
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '0');
            assert.equal((await this.king.balanceOf(alice)).valueOf(), '500');
        });

        xit('lp fee ratio', async () => {
            const archV2 = await ArchbishopV2.new(this.king.address, kingServant, courtJester, `${this.testStartBlock + 750}`, { from: alice });
            const lp = await MockERC20.new('LPToken', 'LP', '400000000000000000000', { from: minter });
            await lp.transfer(alice, '200000000000000000000', { from: minter });
            await lp.transfer(bob, '200000000000000000000', { from: minter });
            await this.king.mint(archV2.address, '5000');
            await lp.approve(archV2.address, '200000000000000000000', { from: alice });
            await lp.approve(archV2.address, '200000000000000000000', { from: bob });
            await archV2.add('1', '100', lp.address, this.sToken.address, true, { from: alice });
            // Alice deposits 10 LPs at block 790
            await time.advanceBlockTo(`${this.testStartBlock + 789}`);
            await archV2.deposit(0, '200000000000000000000', '0', { from: alice });//690
            await archV2.deposit(0, '200000000000000000000', '0', { from: bob });//691
            await time.advanceBlockTo(`${this.testStartBlock + 799}`);
            await archV2.withdraw(0, '5000000000000000000', { from: alice });
            assert.equal((await lp.balanceOf(alice)).valueOf(), '5000000000000000000');
            await archV2.setlpFeePct(5, { from: alice });
            await archV2.withdraw(0, '5000000000000000000', { from: alice });
            assert.equal((await lp.balanceOf(alice)).valueOf(), '9750000000000000000');
            assert.equal((await lp.balanceOf(archV2.address)).valueOf(), '390000000000000000000');
            assert.equal((await lp.balanceOf(kingServant)).valueOf(), '250000000000000000');
            await archV2.withdraw(0, '5000000000000000000', { from: bob });
            assert.equal((await lp.balanceOf(bob)).valueOf(), '4750000000000000000');
            assert.equal((await lp.balanceOf(kingServant)).valueOf(), '500000000000000000');
        });

        xit('king fee ratio', async () => {
            const archV2 = await ArchbishopV2.new(this.king.address, kingServant, courtJester, `${this.testStartBlock + 850}`, { from: alice });
            await this.king.mint(archV2.address, '5000');
            await archV2.setKingPerLptFarmingBlock('5', false,{ from: alice });
            await archV2.setKingPerStFarmingBlock('10', false,{ from: alice });
            await this.lp.approve(archV2.address, '1000', { from: alice });
            await archV2.add('1', '100', this.lp.address, this.sToken.address, true, { from: alice });
            // Alice deposits 10 LPs at block 890
            await time.advanceBlockTo(`${this.testStartBlock + 889}`);
            await archV2.deposit(0, '10', '0', { from: alice });//890
            await time.advanceBlockTo(`${this.testStartBlock + 900}`);
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '250');
            await archV2.deposit(0, '0', '0', { from: alice });//901
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '275');
            assert.equal((await this.king.balanceOf(alice)).valueOf(), '0');
            await archV2.withdraw(0, '5', { from: alice });//902
            assert.equal((await this.king.balanceOf(alice)).valueOf(), '0');
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '300');
            await archV2.setKingLock(0, false, false, { from: alice });
            await archV2.deposit(0, '0', '0', { from: alice });//904
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '0');
            assert.equal((await this.king.balanceOf(alice)).valueOf(), '315');
            await time.advanceBlockTo(`${this.testStartBlock + 909}`);
            await archV2.withdraw(0, '5', { from: alice });//910
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '0');
            assert.equal((await this.king.balanceOf(alice)).valueOf(), '450');
            assert.equal((await this.king.balanceOf(courtJester)).valueOf(), '50');
        });

        xit('withdraw', async () => {
            const archV2 = await ArchbishopV2.new(this.king.address, kingServant, courtJester, `${this.testStartBlock + 1000}`, { from: alice });
            await this.king.mint(archV2.address, '5000');
            await archV2.setKingPerLptFarmingBlock('5', false, { from: alice });
            await archV2.setKingPerStFarmingBlock('10', false, { from: alice });
            await this.lp.approve(archV2.address, '1000', { from: alice });
            await this.sToken.approve(archV2.address, '1000', { from: alice });
            await this.lp.approve(archV2.address, '1000', { from: bob });
            await this.sToken.approve(archV2.address, '1000', { from: bob });
            await archV2.add('100', '10000000000', this.lp.address, this.sToken.address, true, { from: alice });
            await time.advanceBlockTo(`${this.testStartBlock + 1098}`);
            await expectRevert(archV2.deposit(0, '0', '1', { from: alice }), 'deposit:invalid');//990
            await archV2.deposit(0, '1000', '10', { from: alice }); //1000==>alice
            assert.equal((await archV2.userInfo(0, alice)).wAmount, '2000');
            assert.equal((await archV2.userInfo(0, alice)).lptAmount, '1000');
            assert.equal((await archV2.userInfo(0, alice)).stAmount, '10');
            await time.advanceBlockTo(`${this.testStartBlock + 1109}`);
            await archV2.deposit(0, '1000', '10', { from: bob }); //1100==>bob
            assert.equal((await archV2.userInfo(0, bob)).wAmount, '2000');
            assert.equal((await archV2.userInfo(0, bob)).lptAmount, '1000');
            assert.equal((await archV2.userInfo(0, bob)).stAmount, '10');
            await expectRevert(archV2.withdraw(0, '1100', { from: alice }), 'withdraw: LP amount not enough');
            await time.advanceBlockTo(`${this.testStartBlock + 1119}`);
            await archV2.withdraw(0, '500', { from: alice });//1120
            // alice have king = 10*25+1/2*10*25 = 375
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '375');
            assert.equal((await archV2.pendingKing(0, bob)).valueOf(), '125');
            assert.equal((await this.lp.balanceOf(alice)).valueOf(), '500');
            assert.equal((await this.sToken.balanceOf(alice)).valueOf(), '990');
            assert.equal((await archV2.userInfo(0, alice)).stAmount, '0');
            assert.equal((await archV2.userInfo(0, alice)).lptAmount, '500');
            assert.equal((await archV2.userInfo(0, alice)).wAmount, '500');
            assert.equal((await this.lp.balanceOf(archV2.address)).valueOf(), '1500');
            assert.equal((await this.sToken.balanceOf(archV2.address)).valueOf(), '10');
            await time.advanceBlockTo(`${this.testStartBlock + 1129}`);
            await archV2.withdraw(0, '500', { from: bob });//1130
            // alice have king = 1/2*10*25 + 10*25*4/5= 325
            assert.equal((await archV2.pendingKing(0, bob)).valueOf(), '325');
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '500');
            assert.equal((await this.sToken.balanceOf(bob)).valueOf(), '990');
            assert.equal((await archV2.userInfo(0, bob)).stAmount, '0');
            assert.equal((await archV2.userInfo(0, bob)).lptAmount, '500');
            assert.equal((await archV2.userInfo(0, bob)).wAmount, '500');
            assert.equal((await this.lp.balanceOf(archV2.address)).valueOf(), '1000');
            assert.equal((await this.sToken.balanceOf(archV2.address)).valueOf(), '0');
        });

        xit('emergency withdraw', async () => {
            const archV2 = await ArchbishopV2.new(this.king.address, kingServant, courtJester, `${this.testStartBlock + 1100}`, { from: alice });
            await archV2.setKingPerLptFarmingBlock('5', false, { from: alice });
            await archV2.setKingPerStFarmingBlock('10', false, { from: alice });
            await this.lp.approve(archV2.address, '1000', { from: alice });
            await this.sToken.approve(archV2.address, '1000', { from: alice });
            await this.lp.approve(archV2.address, '1000', { from: bob });
            await this.sToken.approve(archV2.address, '1000', { from: bob });
            await archV2.add('100', '10000000000', this.lp.address, this.sToken.address, true, { from: alice });
            await expectRevert(archV2.emergencyWithdraw(0, { from: alice }), 'withdraw: LP amount not enough');
            await archV2.deposit(0, '1000', '10', { from: alice });
            await time.advanceBlockTo(`${this.testStartBlock + 1160}`);
            await archV2.emergencyWithdraw(0, { from: alice })
            assert.equal((await archV2.pendingKing(0, alice)).valueOf(), '0');
            assert.equal((await this.lp.balanceOf(alice)).valueOf(), '1000');
            assert.equal((await this.sToken.balanceOf(alice)).valueOf(), '990');
            assert.equal((await archV2.userInfo(0, alice)).wAmount, '0');
            assert.equal((await archV2.userInfo(0, alice)).stAmount, '0');
            assert.equal((await archV2.userInfo(0, alice)).lptAmount, '0');
        });
    });
});
