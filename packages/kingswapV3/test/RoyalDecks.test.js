/* global artifacts, asert, before, beforeEach, context, contract */
const { expectRevert, time } = require('@openzeppelin/test-helpers');

const RoyalDecks = artifacts.require('MockRoyalDecks');
const MockERC20 = artifacts.require('MockERC20');
const MockERC721 = artifacts.require('MockERC721');

contract('RoyalDecks', (accounts) => {
  const e18 = '000000000000000000';
  const e18andOne = '000000000000000001';
  const [ deployer, alice, bob, klara, , anybody ] = accounts;

  context('_removeArrayElement internal function', () => {
    const els = [
      '108005765669190322414635507609697898386068044203237514870047565119433966354433',
      '108005765669190322414635507609697898386068044203237514870047565400908945031169',
      '113772348642185704331748229598741847809740133625785081752446362757204723236866'
    ]
    beforeEach(async () => {
      this.__t = await RoyalDecks.new(anybody);
      await this.__t.__addArrElements(els);
      assert.equal((await this.__t.__mockArrLength()).toString(), '3')
      assert.equal((await this.__t.__mockArr(0)).toString(), els[0])
      assert.equal((await this.__t.__mockArr(1)).toString(), els[1])
      assert.equal((await this.__t.__mockArr(2)).toString(), els[2])
    });

    it('Should remove the 1st element', async () => {
      await this.__t.__removeArrayElement(els[0])

      assert.equal((await this.__t.__mockArrLength()).toString(), '2')
      assert.equal((await this.__t.__mockArr(0)).toString(), els[1])
      assert.equal((await this.__t.__mockArr(1)).toString(), els[2])
    });

    it('Should remove the 2nd element', async () => {
      await this.__t.__removeArrayElement(els[1])

      assert.equal((await this.__t.__mockArrLength()).toString(), '2')
      assert.equal((await this.__t.__mockArr(0)).toString(), els[0])
      assert.equal((await this.__t.__mockArr(1)).toString(), els[2])
    });

    it('Should remove the last element', async () => {
      await this.__t.__removeArrayElement(els[2])

      assert.equal((await this.__t.__mockArrLength()).toString(), '2')
      assert.equal((await this.__t.__mockArr(0)).toString(), els[0])
      assert.equal((await this.__t.__mockArr(1)).toString(), els[1])
    });

    it('Should remove all elements', async () => {
      await this.__t.__removeArrayElement(els[1])
      assert.equal((await this.__t.__mockArrLength()).toString(), '2')
      assert.equal((await this.__t.__mockArr(0)).toString(), els[0])
      assert.equal((await this.__t.__mockArr(1)).toString(), els[2])

      await this.__t.__removeArrayElement(els[0])
      assert.equal((await this.__t.__mockArrLength()).toString(), '1')
      assert.equal((await this.__t.__mockArr(0)).toString(), els[2])

      await this.__t.__removeArrayElement(els[0])
      assert.equal((await this.__t.__mockArrLength()).toString(), '0')
    });

    it('Should remove all elements (#2)', async () => {
      await this.__t.__removeArrayElement(els[0])
      assert.equal((await this.__t.__mockArrLength()).toString(), '2')
      assert.equal((await this.__t.__mockArr(0)).toString(), els[1])
      assert.equal((await this.__t.__mockArr(1)).toString(), els[2])

      await this.__t.__removeArrayElement(els[1])
      assert.equal((await this.__t.__mockArrLength()).toString(), '1')
      assert.equal((await this.__t.__mockArr(0)).toString(), els[2])

      await this.__t.__removeArrayElement(els[2])
      assert.equal((await this.__t.__mockArrLength()).toString(), '0')
    });

    it('Should remove all elements (#3)', async () => {
      await this.__t.__removeArrayElement(els[2])
      assert.equal((await this.__t.__mockArrLength()).toString(), '2')
      assert.equal((await this.__t.__mockArr(0)).toString(), els[0])
      assert.equal((await this.__t.__mockArr(1)).toString(), els[1])

      await this.__t.__removeArrayElement(els[1])
      assert.equal((await this.__t.__mockArrLength()).toString(), '1')
      assert.equal((await this.__t.__mockArr(0)).toString(), els[0])

      await this.__t.__removeArrayElement(els[0])
      assert.equal((await this.__t.__mockArrLength()).toString(), '0')
    });

    it('Should remove 12 elements', async () => {
      await this.__t.__addArrElements([ '3', '4', '5', '6', '7', '8', '9', '10', '11' ]);
      assert.equal((await this.__t.__mockArrLength()).toString(), '12')

      await this.__t.__removeArrayElement(els[0])
      await this.__t.__removeArrayElement('7')
      await this.__t.__removeArrayElement('3')
      await this.__t.__removeArrayElement('11')
      await this.__t.__removeArrayElement(els[1])
      assert.equal((await this.__t.__mockArrLength()).toString(), '7')
      assert.equal((await this.__t.__mockArr(0)).toString(), els[2])
      assert.equal((await this.__t.__mockArr(5)).toString(), '9')

      await this.__t.__removeArrayElement(els[2])
      await this.__t.__removeArrayElement('4')
      await this.__t.__removeArrayElement('5')
      await this.__t.__removeArrayElement('10')
      await this.__t.__removeArrayElement('9')
      await this.__t.__removeArrayElement('8')
      assert.equal((await this.__t.__mockArrLength()).toString(), '1')
      assert.equal((await this.__t.__mockArr(0)).toString(), '6')

      await this.__t.__removeArrayElement('6')
      assert.equal((await this.__t.__mockArrLength()).toString(), '0')
    });
  });

  context('TODO: create tests from "bulk" test bellow (#1)', () => {
    it('Should run 1st "bulk" test', async () => {
      const t = await RoyalDecks.new(anybody)
      assert.equal((await t.__ids()).length, 0);
      assert.equal((await t.__stake(0)).amountStaked.toString(), '0');
      // assert.equal(await t.__stake(0), { amountStaked: '0', amountDue: '0', startTime: '0', unlockTime: '0' });

      await t.__addUserStake(112, { amountStaked : 10, amountDue: 12, startTime: 110, unlockTime: 114 })
      assert.equal((await t.__stake(112)).amountStaked.toString(), '10');
      // assert.equal(await t.__stake(112), { amountStaked : 10, amountDue: 12, startTime: 110, unlockTime: 114 });

      await t.__addUserStake(113, { amountStaked : 11, amountDue: 13, startTime: 110, unlockTime: 114 })
      assert.equal((await t.__stake(113)).amountStaked.toString(), '11');
      //assert.equal(await t.__stake(113), { amountStaked : 11, amountDue: 13, startTime: 110, unlockTime: 114 });
      assert.equal((await t.__ids()).reduce((a, e) => a + e.toString() + ';', ''), '112;113;');

      await t.__removeUserStake(113)
      assert.equal((await t.__ids()).reduce((a, e) => a + e.toString() + ';', ''), '112;');

      await t.__removeUserStake(112)
      assert.equal((await t.__ids()).length, 0);

      await t.__addUserStake(112, { amountStaked : 10, amountDue: 12, startTime: 120, unlockTime: 124 })
      await t.__addUserStake(113, { amountStaked : 11, amountDue: 13, startTime: 120, unlockTime: 124 })
      assert.equal((await t.__ids()).reduce((a, e) => a + e.toString() + ';', ''), '112;113;');

      await t.__removeUserStake(112)
      assert.equal((await t.__ids()).reduce((a, e) => a + e.toString() + ';', ''), '113;');

      await t.__addUserStake(112, { amountStaked : 10, amountDue: 12, startTime: 130, unlockTime: 134 })
      assert.equal((await t.__ids()).reduce((a, e) => a + e.toString() + ';', ''), '113;112;');

      await t.__removeUserStake(113)
      assert.equal((await t.__ids()).reduce((a, e) => a + e.toString() + ';', ''), '112;');

      await expectRevert(t.__removeUserStake(113), 'RDeck:INVALID_STAKE_ID');
      await t.__addUserStake(113, { amountStaked : 11, amountDue: 13, startTime: 110, unlockTime: 124 })

      await expectRevert(
          t.__addUserStake(113, { amountStaked : 11, amountDue: 13, startTime: 110, unlockTime: 124 }),
          'RDeck:DUPLICATED_STAKE_ID',
      );
    });
  });

  context('TODO: create tests from "bulk test" bellow (#2)', () => {
    beforeEach(async () => {
      this.king = await MockERC20.new("$KING", "$KING", '1000000' + e18)
      await this.king.transfer(alice, '100000' + e18)
      await this.king.transfer(bob, '100000' + e18)
      await this.king.transfer(klara, '100000' + e18)
      await this.king.transfer(klara, '1')

      this.decks = await RoyalDecks.new(this.king.address)
      await this.king.approve(this.decks.address, '100000' + e18)
      await this.decks.addKingReserves(deployer, '100000' + e18)

      this.kingNft = await MockERC721.new("Mock KING", "KING", klara, 1)

      this.queen = await MockERC721.new("Mock QUEEN", "QUEEN", deployer, 4)
      await this.queen.safeTransferFrom(deployer, alice, 1, '0x0')
      await this.queen.safeTransferFrom(deployer, bob, 2, '0x0')
      await this.queen.safeTransferFrom(deployer, bob, 3, '0x0')
      await this.queen.safeTransferFrom(deployer, bob, 4, '0x0')

      this.knight = await MockERC721.new("Mock KNIGHT", "KNIGHT", deployer, 4)
      await this.knight.safeTransferFrom(deployer, alice, 1, '0x0')
      await this.knight.safeTransferFrom(deployer, alice, 2, '0x0')
      await this.knight.safeTransferFrom(deployer, klara, 3, '0x0')
      await this.knight.safeTransferFrom(deployer, klara, 4, '0x0')

      await this.decks.addTerms([
        { // termsId: 0
          nft: this.queen.address,
          minAmount: '1000' + e18,
          lockHours: '1',
          kingFactor: '1100000',
          enabled: true
        },
        {  // termsId: 1
          enabled: true,
          nft: this.knight.address,
          minAmount: '5000' + e18,
          lockHours: '1',
          kingFactor: '1001000',
        },
        { // termsId: 2
          nft: this.queen.address,
          minAmount: '2000' + e18,
          lockHours: '2',
          kingFactor: '1110000',
          enabled: true
        },
        { // termsId: 3
          enabled: true,
          nft: this.knight.address,
          minAmount: '6000' + e18,
          lockHours: '3',
          kingFactor: '1003000',
        },
        { // termsId: 4
          enabled: true,
          nft: this.kingNft.address,
          minAmount: '1',
          lockHours: '2',
          kingFactor: '1000000',
        }
      ])

      await this.decks.addAirdropPools(
          [ this.kingNft.address, this.queen.address, this.knight.address ],
          [ 6, 3, 1 ],
      )
    });

    beforeEach(async () => {
      await this.king.approve(this.decks.address, '2000' + e18, { from: alice })
      await this.king.approve(this.decks.address, '20000' + e18, { from: bob })
      await this.king.approve(this.decks.address, '100000' + e18andOne, { from: klara })

      await this.kingNft.approve(this.decks.address, '1', { from: klara })

      await this.queen.approve(this.decks.address, '1', { from: alice })
      await this.queen.approve(this.decks.address, '3', { from: bob })
      await this.queen.approve(this.decks.address, '4', { from: bob })

      await this.knight.approve(this.decks.address, '3', { from: klara })
      await this.knight.approve(this.decks.address, '4', { from: klara })
    });

    it('Should run 2nd "bulk" test', async () => {
      let tx;
      tx = await this.decks.enableTerms('1');
      assert.equal(tx.logs[0].event, 'TermsEnabled');

      let terms0 = await this.decks.termSheet('0')
      assert.equal(terms0.nft, this.queen.address);
      assert.equal(terms0.minAmount, '1000' + e18);
      assert.equal(terms0.lockHours, '1');
      assert.equal(terms0.kingFactor, '1100000');
      assert.equal(terms0.enabled, true);

      let terms1 = await this.decks.termSheet('1')
      assert.equal(terms1.nft, this.knight.address);
      assert.equal(terms1.minAmount, '5000' + e18);
      assert.equal(terms1.lockHours, '1');
      assert.equal(terms1.kingFactor, '1001000');
      assert.equal(terms1.enabled, true);

      // stake0 deposited
      tx = await this.decks.deposit('0', '1', '2000' + e18, { from: alice })
      let stake0StartTime = parseInt((await web3.eth.getBlock(tx.receipt.blockHash)).timestamp.toString());

      let stake0Id = (await this.decks.encodeStakeId(this.queen.address, '1', `${stake0StartTime}`, '1')).toString();
      let stake0 = await this.decks.stakeData(alice, stake0Id)
      assert.equal(tx.logs[0].args.user, alice);
      assert.equal(tx.logs[0].args.stakeId.toString(), stake0Id);
      assert.equal(tx.logs[0].args.amountStaked, '2000' + e18);
      assert.equal(tx.logs[0].args.amountDue, '2200' + e18);
      assert.equal(tx.logs[0].args.unlockTime, `${ 3600 + stake0StartTime}`);
      assert.equal(stake0.amountStaked, '2000' + e18);
      assert.equal(stake0.amountDue, '2200' + e18);
      assert.equal(stake0.unlockTime, `${3600 + stake0StartTime}`);

      let stake0decodedId = await this.decks.decodeStakeId(stake0Id);
      assert.equal(stake0decodedId.nft.toLowerCase(), this.queen.address.toLowerCase());
      assert.equal(stake0decodedId.nftId.toString(), '1');
      assert.equal(stake0decodedId.startTime.toString(), `${stake0StartTime}`);
      assert.equal(stake0decodedId.stakeHours.toString(), '1');

      assert.equal((await this.decks.kingReserves()).toString(), `${100000 + 2000}` + e18);
      assert.equal((await this.king.balanceOf(this.decks.address)).toString(), '102000' + e18);
      assert.equal((await this.decks.kingDue()).toString(), '2200' + e18);

      await time.increase(30)

      // stake1 deposited
      tx = await this.decks.deposit('0', '3', '12000' + e18, { from: bob })
      let stake1Id = tx.logs[0].args.stakeId.toString()
      let stake1 = await this.decks.stakeData(bob, stake1Id)
      assert.equal(stake1.amountStaked, '12000' + e18);
      assert.equal(tx.logs[0].args.amountDue, '13200' + e18);

      await time.increase(30)

      // stake2 deposited
      tx = await this.decks.deposit('2', '4', '8000' + e18, { from: bob })
      let stake2Id = tx.logs[0].args.stakeId.toString()
      let stake2 = await this.decks.stakeData(bob, stake2Id)
      assert.equal(stake2.amountStaked, '8000' + e18);
      assert.equal(stake2.amountDue, '8880' + e18);

      await expectRevert(this.decks.withdraw(stake0Id, { from: alice }), 'withdraw: stake is locked');
      await expectRevert(this.decks.withdraw(stake0Id, { from: bob }), 'withdraw: unknown or returned stake');

      await time.increase(30)

      // stake3 deposited
      tx = await this.decks.deposit('1', '3', '40000' + e18, { from: klara })
      let stake3Id = tx.logs[0].args.stakeId.toString()
      let stake3 = await this.decks.stakeData(klara, stake3Id)
      assert.equal(tx.logs[0].args.amountStaked, '40000' + e18);
      assert.equal(tx.logs[0].args.amountDue, '40040' + e18);

      await time.increase(30)

      await this.decks.disableTerms('1');
      await expectRevert(this.decks.deposit('1', '4', '60000' + e18, { from: klara }), "deposit: terms disabled")
      await this.decks.enableTerms('1');

      // stake4 deposited
      tx = await this.decks.deposit('1', '4', '60000' + e18, { from: klara })
      let stake4Id = tx.logs[0].args.stakeId.toString()
      let stake4 = await this.decks.stakeData(klara, stake4Id)
      assert.equal(stake4.amountStaked, '60000' + e18);
      assert.equal(stake4.amountDue, '60060' + e18);

      // stake5 deposited
      tx = await this.decks.deposit('4', '1', '1', { from: klara })
      let stake5Id = tx.logs[0].args.stakeId.toString()
      let stake5 = await this.decks.stakeData(klara, stake5Id)
      assert.equal(stake5.amountStaked, '1')
      assert.equal(stake5.amountDue, '1')
      assert.equal((await this.kingNft.balanceOf(this.decks.address)).toString(), '1')

      assert.equal((await this.decks.kingReserves()).toString(), `${100000 + 2000 + 12000 + 8000 + 40000 + 60000}` + e18andOne);
      assert.equal((await this.king.balanceOf(this.decks.address)).toString(), '222000' + e18andOne);
      assert.equal((await this.decks.kingDue()).toString(), `${2200 + 13200 + 8880 + 40040 + 60060}` + e18andOne);

      assert.equal((await this.kingNft.balanceOf(this.decks.address)).toString(), '1')
      assert.equal((await this.queen.balanceOf(this.decks.address)).toString(), '3')
      assert.equal((await this.knight.balanceOf(this.decks.address)).toString(), '2')

      await time.increaseTo(stake0.unlockTime);

      // stake0 withdrawn
      await this.decks.withdraw(stake0Id, { from: alice })

      assert.equal((await this.decks.kingReserves()).toString(), `${222000 - 2200}` + e18andOne);
      assert.equal((await this.king.balanceOf(this.decks.address)).toString(), `${222000 - 2200}` + e18andOne);
      assert.equal((await this.decks.kingDue()).toString(), `${13200 + 8880 + 40040 + 60060}` + e18andOne);

      await expectRevert(this.decks.withdraw(stake0Id, { from: alice }), 'withdraw: unknown or returned stake');

      await time.increaseTo(stake1.unlockTime);

      let stakeIds = await this.decks.stakeIds(bob);
      assert.equal(stakeIds.length, 2)
      assert.equal(stakeIds[0], stake1Id)
      assert.equal(stakeIds[1], stake2Id)

      stakeIds = await this.decks.stakeIds(klara);
      assert.equal(stakeIds.length, 3)

      // stake1 withdrawn
      await this.decks.withdraw(stake1Id, { from: bob })

      stakeIds = await this.decks.stakeIds(bob);
      assert.equal(stakeIds.length, 1)
      assert.equal(stakeIds[0], stake2Id)

      await time.increaseTo(stake3.unlockTime);

      stakeIds = await this.decks.stakeIds(klara);
      assert.equal(stakeIds.length, 3)
      assert.equal(stakeIds[0], stake3Id)
      assert.equal(stakeIds[1], stake4Id)
      assert.equal(stakeIds[2], stake5Id)

      // stake3 withdrawn
      await this.decks.withdraw(stake3Id, { from: klara })
      stakeIds = await this.decks.stakeIds(klara);
      assert.equal(stakeIds.length, 2)

      await time.increaseTo(stake4.unlockTime);

      // stake4 withdrawn
      await this.decks.withdraw(stake4Id, { from: klara })

      assert.equal((await this.decks.kingDue()).toString(), '8880' + e18andOne);
      assert.equal((await this.decks.kingReserves()).toString(), `${222000 - 2200 - 13200 - 40040 - 60060}` + e18andOne);
      assert.equal((await this.king.balanceOf(this.decks.address)).toString(), '106500' + e18andOne);

      assert.equal(await this.decks.emergencyWithdrawEnabled(), false);
      await this.decks.enableEmergencyWithdraw();
      assert.equal(await this.decks.emergencyWithdrawEnabled(), true);

      await expectRevert(this.decks.removeKingReserves('100000' + e18, { from: deployer }), "RDeck:TOO_LOW_RESERVES");
      await this.decks.removeKingReserves('90000' + e18, { from: deployer })

      // stake2 withdrawn (emergency)
      await expectRevert(this.decks.withdraw(stake2Id, { from: bob }), "withdraw: stake is locked");
      await this.decks.emergencyWithdraw(stake2Id, { from: bob })

      assert.equal((await this.queen.balanceOf(alice)).toString(), '1')
      assert.equal((await this.queen.balanceOf(bob)).toString(), '3')
      assert.equal((await this.knight.balanceOf(alice)).toString(), '2')
      assert.equal((await this.knight.balanceOf(klara)).toString(), '2')

      await time.increaseTo(stake5.unlockTime);

      // stake5 withdrawn
      await this.decks.withdraw(stake5Id, { from: klara })

      assert.equal((await this.kingNft.balanceOf(klara)).toString(), '1')
      assert.equal((await this.decks.kingDue()).toString(), '0');
      assert.equal((await this.decks.kingReserves()).toString(), `${106500 - 90000 - 8880}` + e18);
      assert.equal((await this.king.balanceOf(this.decks.address)).toString(), `${7620 + 880}` + e18);
    });

    it('Should run 3rd "bulk" test', async () => {
      let tx;
      await this.decks.enableTerms('1');

      // stake0 deposited (QUEEN)
      tx = await this.decks.deposit('0', '1', '2000' + e18, { from: alice })
      let stake0Id = tx.logs[0].args.stakeId.toString()
      let stake0 = await this.decks.stakeData(alice, stake0Id)
      await time.increase(30)

      // Airdrop rewards #1 transferred
      await this.king.transfer(this.decks.address, '2500' + e18)

      // stake1 deposited (QUEEN)
      tx = await this.decks.deposit('0', '3', '12000' + e18, { from: bob })
      let stake1Id = tx.logs[0].args.stakeId.toString()
      await time.increase(30)

      // stake3 deposited (KNIGHT)
      tx = await this.decks.deposit('1', '3', '40000' + e18, { from: klara })
      let stake3Id = tx.logs[0].args.stakeId.toString()
      let stake3 = await this.decks.stakeData(klara, stake3Id)
      await time.increase(30)

      assert.equal((await this.decks.pendedAirdrop(stake1Id)).toString(), '0')
      assert.equal((await this.decks.pendedAirdrop(stake3Id)).toString(), '0')

      // Airdrop rewards #1 "collected"
      tx = await this.decks.collectAirdrops()
      // Aairdrop #1 gets distributed as 1x3/(2x3+1x1), 1x3/(2x3+1x1) and 1x1/(2x3+1x1)
      assert.equal(tx.logs[0].args.amount.toString(), '2500' + e18)
      assert.equal((await this.decks.pendedAirdrop(stake0Id)).toString(), '1071'+ '428571428571428571')
      assert.equal((await this.decks.pendedAirdrop(stake1Id)).toString(), '1071'+ '428571428571428571')
      assert.equal((await this.decks.pendedAirdrop(stake3Id)).toString(), '357' + '142857142857142857')

      // stake2 deposited (QUEEN)
      tx = await this.decks.deposit('2', '4', '8000' + e18, { from: bob })
      let stake2Id = tx.logs[0].args.stakeId.toString()
      await time.increase(30)

      // stake4 deposited (KNIGHT)
      tx = await this.decks.deposit('1', '4', '60000' + e18, { from: klara })
      let stake4Id = tx.logs[0].args.stakeId.toString()
      let stake4 = await this.decks.stakeData(klara, stake4Id)
      await time.increase(30)

      // stake5 deposited (KING)
      tx = await this.decks.deposit('4', '1', '1', { from: klara })
      let stake5Id = tx.logs[0].args.stakeId.toString()
      let stake5 = await this.decks.stakeData(klara, stake5Id)
      await time.increase(30)

      // Airdrop rewards #2 transferred ...
      await this.king.transfer(this.decks.address, '12500' + e18)
      // ... and "collected"
      tx = await this.decks.collectAirdrops()
      assert.equal(tx.logs[0].args.amount.toString(), '12500' + e18)
      // 12500 x 3/(1x6+3x3+2x1) + 1071.428571428571428571
      assert.equal((await this.decks.pendedAirdrop(stake0Id)).toString(), '3277' + '310924369747899159')
      // 12500 x 3/(1x6+3x3+2x1) + 1071.428571428571428571
      assert.equal((await this.decks.pendedAirdrop(stake1Id)).toString(), '3277' + '310924369747899159')
      // 12500 x 3/(1x6+3x3+2x1) + 0
      assert.equal((await this.decks.pendedAirdrop(stake2Id)).toString(), '2205' + '882352941176470588')
      // 12500 x 1/(1x6+3x3+2x1) + 357.142857142857142857
      assert.equal((await this.decks.pendedAirdrop(stake3Id)).toString(), '1092' + '436974789915966386')
      // 12500 x 1/(1x6+3x3+2x1) + 0
      assert.equal((await this.decks.pendedAirdrop(stake4Id)).toString(),  '735' + '294117647058823529')
      // 12500 x 6/(1x6+3x3+2x1) + 0
      assert.equal((await this.decks.pendedAirdrop(stake5Id)).toString(), '4411' + '764705882352941176')

      assert.equal(
          (await this.decks.kingReserves()).toString(),
          `${100000 + 2000 + 12000 + 8000 + 40000 + 60000 + 2500 + 12500}` + e18andOne,
      );
      assert.equal(
          (await this.king.balanceOf(this.decks.address)).toString(),
          `${222000 + 2500 + 12500}` + e18andOne,
      );
      assert.equal(
          (await this.decks.kingDue()).toString(),
          `${2200 + 13200 + 8880 + 40040 + 60060 + 2500 + 12500}` + e18andOne,
      );

      await time.increaseTo(stake0.unlockTime);

      // stake0 withdrawn
      let balanceBefore = await this.king.balanceOf(alice)
      await this.decks.withdraw(stake0Id, { from: alice })
      let balanceAfter = await this.king.balanceOf(alice)
      // 2200. + 3277.310924369747899159
      assert.equal(balanceAfter.sub(balanceBefore).toString(), '5477310924369747899159')

      await time.increaseTo(stake3.unlockTime);

      // stake3 withdrawn
      balanceBefore = await this.king.balanceOf(klara)
      await this.decks.withdraw(stake3Id, { from: klara })
      stakeIds = await this.decks.stakeIds(klara);
      assert.equal(stakeIds.length, 2)
      balanceAfter = await this.king.balanceOf(klara)
      // 40040. + 1092.436974789915966386
      assert.equal(balanceAfter.sub(balanceBefore).toString(), '41132436974789915966386')

      await time.increaseTo(stake4.unlockTime);

      // stake4 withdrawn
      balanceBefore = await this.king.balanceOf(klara)
      await this.decks.withdraw(stake4Id, { from: klara })
      balanceAfter = await this.king.balanceOf(klara)
      // 60060. + 735.294117647058823529
      assert.equal(balanceAfter.sub(balanceBefore).toString(), 60795294117647058823529)

      // stake1 withdrawn
      balanceBefore = await this.king.balanceOf(bob)
      await this.decks.withdraw(stake1Id, { from: bob })
      balanceAfter = await this.king.balanceOf(bob)
      // 13200. + 3277.310924369747899159
      assert.equal(balanceAfter.sub(balanceBefore).toString(), 16477310924369747899159)

      assert.equal(await this.decks.emergencyWithdrawEnabled(), false);
      await this.decks.enableEmergencyWithdraw();
      assert.equal(await this.decks.emergencyWithdrawEnabled(), true);

      await this.decks.removeKingReserves('90000' + e18, { from: deployer })

      // stake2 withdrawn (emergency)
      balanceBefore = await this.king.balanceOf(bob)
      await expectRevert(this.decks.withdraw(stake2Id, { from: bob }), "withdraw: stake is locked");
      await this.decks.emergencyWithdraw(stake2Id, { from: bob })
      balanceAfter = await this.king.balanceOf(bob)
      // 8000. + 0
      assert.equal(balanceAfter.sub(balanceBefore).toString(), '8000' + e18)

      // Rewards left by the stake emergency withdrawal gets "collected"
      tx = await this.decks.collectAirdrops()
      // 880. + 2205.882352941176470588
      assert.equal(tx.logs[0].args.amount.toString(), 3085882352941176470588)

      await time.increaseTo(stake5.unlockTime);

      // stake5 withdrawn
      balanceBefore = await this.king.balanceOf(klara)
      await this.decks.withdraw(stake5Id, { from: klara })
      balanceAfter = await this.king.balanceOf(klara)
      // 1e-18 + 3085.882352941176470588 + 4411.764705882352941176
      assert.equal(balanceAfter.sub(balanceBefore).toString(), '7497647058823529411765')

      /* Stake $KING  %Out    Airdrop rewards            Total Out
         ------------------------------------------------------------------------
         #0:    2000 +  200. + 3277.310924369747899159 =  5477.310924369747899159
         #1:   12000 + 1200. + 3277.310924369747899159 = 16477.310924369747899159
         #2:    8000 +  880. + -880                    =  8000.000000000000000000
         #3:   40000 +   40. + 1092.436974789915966386 = 41132.436974789915966386
         #4:   60000 +   60. +  735.294117647058823529 = 60795.294117647058823529
         #5:   1e-18 +    0. + 3085.882352941176470588        .
                             + 4411.764705882352941176 =  7497.647058823529411765
             =122000  =2380  =15000                    =139380                 */

      // (100000. - 90000.) - 2380. = 7620. *e+18
      assert.equal((await this.decks.kingReserves()).toString(), '7620' + '000000000000000003');
      assert.equal((await this.king.balanceOf(this.decks.address)).toString(), '7620' + '000000000000000003');
      assert.equal(Math.abs(parseInt(await this.decks.kingDue()).toString()) < 10, true)
    });
  });
});
