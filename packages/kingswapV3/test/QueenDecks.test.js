/* global artifacts, asert, before, beforeEach, context, contract */
const { expectRevert, time } = require('@openzeppelin/test-helpers');

const QueenDecks = artifacts.require('MockQueenDecks');
const MockERC20 = artifacts.require('MockERC20');

const e18 = '000000000000000000';
const BN =  web3.utils.toBN;

contract('QueenDecks', (accounts) => {
  const [ , alice, bob, treasury, , anybody ] = accounts;

  before(async () => {
    this.token0 = await MockERC20.new("token0", "T0", `${1e6}` + e18)
    await this.token0.transfer(alice, `${0.1e6}` + e18);

    this.token1 = await MockERC20.new("token1", "T1", `${1e6}` + e18)
    await this.token1.transfer(alice, `${0.1e6}` + e18);
    await this.token1.transfer(bob, `${0.1e6}` + e18);

    this.token2 = await MockERC20.new("token2", "T2", `${1e6}` + e18)
    await this.token2.transfer(bob, `${0.1e6}` + e18);

    this.decks = await QueenDecks.new(treasury);
    this.termsheets = getTermSheetsArr(this.token0.address, this.token1.address, this.token2.address);
    await this.decks.addTerms(this.termsheets);

    await this.token0.approve(this.decks.address, `${0.1e6}` + e18, { from: alice });
    await this.token0.approve(this.decks.address, `${0.2e6}` + e18, { from: treasury });

    await this.token1.approve(this.decks.address, `${0.1e6}` + e18, { from: alice });
    await this.token1.approve(this.decks.address, `${0.1e6}` + e18, { from: bob });
    await this.token1.approve(this.decks.address, `${0.2e6}` + e18, { from: treasury });

    await this.token2.approve(this.decks.address, `${0.1e6}` + e18, { from: bob });
    await this.token2.approve(this.decks.address, `${0.2e6}` + e18, { from: treasury });
  });

  context('_removeArrayElement internal function', () => {
    const els = [
      '108005765669190322414635507609697898386068044203237514870047565119433966354433',
      '108005765669190322414635507609697898386068044203237514870047565400908945031169',
      '113772348642185704331748229598741847809740133625785081752446362757204723236866'
    ]
    beforeEach(async () => {
      this.__t = await QueenDecks.new(anybody);
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

  context('_amountDueOn internal function', () => {
    const getSampleStake = () => ({
      amount: `${1e18}`,
      unlockTime:     '160001000',
      lastRewardTime: '160000000',
      rewardFactor: `${1.1e6}`,
      rewardLockHours: '1',
      lockHours: '1000',
    });

    const expReward = BN('1' + e18)
        .div(BN(10)).mul(BN(`${160001000 - 160000000}`)).div(BN(`${1000 * 3600}`));

    it('shall return zero reward for zero amount', async() => {
      const stake = getSampleStake();
      stake.amount = '0';
      const act= await this.decks.__amountDueOn(stake, 160002000);
      assert.equal(act[0].toString(), '0'); // totalDue
      assert.equal(act[1].toString(), '0'); // rewardDue
    });

    it('shall return zero reward for for `timestamp <= lastRewardTime`', async() => {
      const stake = getSampleStake();
      const act1 = await this.decks.__amountDueOn(stake, 160000000);
      const act2 = await this.decks.__amountDueOn(stake, 159999999);
      assert.equal(act1[0].toString(), `${1e18}`); // totalDue
      assert.equal(act1[1].toString(), '0'); // rewardDue
      assert.equal(act2[0].toString(), `${1e18}`);
      assert.equal(act2[1].toString(), '0');
    });

    it('shall return zero reward for for `lastRewardTime >= unlockTime`', async() => {
      const stake1 = getSampleStake();
      stake1.lastRewardTime = '160001000'
      const stake2 = getSampleStake();
      stake2.lastRewardTime = '160001001'

      const act1 = await this.decks.__amountDueOn(stake1, 160005000);
      const act2 = await this.decks.__amountDueOn(stake2, 160005000);
      assert.equal(act1[0].toString(), `${1e18}`); // totalDue
      assert.equal(act1[1].toString(), '0'); // rewardDue
      assert.equal(act2[0].toString(), `${1e18}`);
      assert.equal(act2[1].toString(), '0');
    });

    it('shall return expected reward #1', async() => {
      const stake = getSampleStake();
      const act = await this.decks.__amountDueOn(stake, 160002000);

      assert.equal(act[0].toString(), BN('1' + e18).add(expReward).toString());
      assert.equal(act[1].toString(), expReward.toString());
    });

    it('shall return expected reward #2', async() => {
      const stake = getSampleStake();
      const act = await this.decks.__amountDueOn(stake, 160001000);

      assert.equal(act[0].toString(), BN('1' + e18).add(expReward).toString());
      assert.equal(act[1].toString(), expReward.toString());
    });

    it('shall return expected reward #3', async() => {
      const stake = getSampleStake();
      const act = await this.decks.__amountDueOn(stake, 160005000);

      assert.equal(act[0].toString(), BN('1' + e18).add(expReward).toString());
      assert.equal(act[1].toString(), expReward.toString());
    });

    it('shall return expected reward #4', async() => {
      const stake = getSampleStake();
      const act = await this.decks.__amountDueOn(stake, 160000500);
      assert.equal(act[0].toString(), BN('1' + e18).add(expReward.div(BN(2))).toString());
      assert.equal(act[1].toString(), expReward.div(BN(2)).toString());
    });
  });

  context('termsheet functions', () => {

    context('termsLength()', () => {
      it('shall return number of termsheets', async() => {
        assert.equal((await this.decks.termsLength()).toString(), '5');
      });
    });

    context('allTermSheets(..)', () => {
      it('shall return all termsheets', async() => {
        const sheets = await this.decks.allTermSheets();
        assert.equal(sheets.length, 5);
        assert.equal(sheets[3].maxAmountFactor.toString(), `${5e4}`);
      });
    });

    context('termSheet(..)', () => {
      it('shall return all requested termsheet', async() => {
        const sheet = await this.decks.termSheet(3);
        assert.equal(sheet.maxAmountFactor.toString(), `${5e4}`);
        assert.equal(sheet.token.toLowerCase(), `${this.token1.address.toLowerCase()}`);
      });
    });

    context('addTerms(..)', () => {
      it('shall revert adding duplications', async() => {
        await expectRevert(this.decks.addTerms([ this.termsheets[3] ]), "QDeck:add:TERMS_DUPLICATED");
      });

      it('shall add new termsheet', async() => {
        const newSheet = JSON.parse(JSON.stringify(this.termsheets[3]));
        newSheet.minAmount = '33' + e18;
        assert.equal((await this.decks.termsLength()).toString(), '5');
        await this.decks.addTerms([ newSheet ]);
        assert.equal((await this.decks.termsLength()).toString(), '6');
      });
    });
  });

  context('deposit() function', () => {
    it('shall revert a deposit under disabled termsheet', async () => {
      await expectRevert(
          this.decks.deposit(2, '30' + e18, { from: bob }),
          "deposit: terms disabled"
      );
    });

    it('shall revert a deposit with too small amount', async () => {
      await expectRevert(
          this.decks.deposit(1, `${30e15}`, { from: bob }),
         "deposit: too small amount"
      );
    });

    it('shall revert a deposit with too big amount', async () => {
      await expectRevert(
          this.decks.deposit(3, '70' + e18, { from: bob }),
          "deposit: too big amount"
      );
    });

    it('shall open a deposit with acceptable amount', async () => {
      await this.decks.deposit(1, '30' + e18, { from: bob });
    });

    context('opening a deposit', () => {
      before(async () => {
        assert.equal((await this.token0.balanceOf(alice)).toString(), '100000' + e18);
        assert.equal((await this.token0.balanceOf(treasury)).toString(), '0');

        this.depositTx = await this.decks.deposit(4, '20' + e18, { from: alice });
        this.stakeId = this.depositTx.logs[0].args.stakeId;
        this.depositTime = (await web3.eth.getBlock('latest')).timestamp;
      });

      it('shall transfer deposited token from user account', async () => {
        assert.equal((await this.token0.balanceOf(alice)).toString(), '99980' + e18);
      });

      it('shall transfer deposited token to treasury account', async () => {
        assert.equal((await this.token0.balanceOf(treasury)).toString(), '20' + e18);
      });

      it('shall emit Deposit event with valid params', async () => {
        assert.equal(this.depositTx.logs[0].event, 'Deposit');
        assert.equal(this.depositTx.logs[0].args.token.toLowerCase(), this.token0.address.toLowerCase());
        assert.equal(this.depositTx.logs[0].args.user.toLowerCase(), alice.toLowerCase());
        assert.equal(this.depositTx.logs[0].args.amount.toString(), '20' + e18);
        assert.equal(this.depositTx.logs[0].args.amountDue.toString(), `${20 * 1.1}` + e18);
        assert.equal(this.depositTx.logs[0].args.unlockTime.toString(), `${24 * 30 * 3600 + this.depositTime}`);
      });

      it('shall add the deposit to stakes', async () => {
        const stake = await this.decks.stakeData(alice, this.stakeId);
        // amount
        assert.equal(stake[0].toString(), '20' + e18);
        // unlockTime
        assert.equal(stake[1].toString(), `${24 * 30 * 3600 + this.depositTime}`);
        // lastRewardTime
        assert.equal(stake[2].toString(), `${this.depositTime}`);
        // rewardLockHours
        assert.equal(stake[3].toString(), `${1.1e6}`);
      });
    });
  });

  context('withdrawReward() function', () => {

    beforeEach(async () => {
      this.depositTx = await this.decks.deposit(0, '50' + e18, { from: alice });
      this.stakeId = this.depositTx.logs[0].args.stakeId;
      this.depositTime = (await web3.eth.getBlock('latest')).timestamp;
    });

    it('shall revert the call for unknown stake', async () => {
      await time.increase(180);
      await expectRevert(
          this.decks.withdrawReward(BN(this.stakeId).add(BN(1)).toString(), { from: alice }),
          "QDeck:unknown or returned stake");
    });

    it('shall revert the call for already withdrawn stake', async () => {
      await time.increase(180);
      await this.decks.enableEmergencyWithdraw();
      await this.decks.emergencyWithdraw(this.stakeId,  { from: alice });
      await expectRevert(
          this.decks.withdrawReward(this.stakeId, { from: alice }),
          "QDeck:unknown or returned stake",
      );
    });

    it('shall revert the call before reward lock interval passes', async () => {
      await time.increase(180);
      const act = await this.decks.getAmountDue(alice, this.stakeId);
      assert.equal(act.totalDue.gt(BN('50' + e18)), true);
      await expectRevert(this.decks.withdrawReward(this.stakeId, { from: alice }),
        "QDeck:reward withdrawal not yet allowed",
      );
    });

    it('shall withdraw the reward after lock interval passes', async () => {
      await time.increase(3600 + 180);
      const act = await this.decks.getAmountDue(alice, this.stakeId);
      assert.equal(act.totalDue.gt(BN('50' + e18)), true);

      // const balanceBefore = {
      //   alice: await this.token0.balanceOf(alice),
      //   treasury: await this.token0.balanceOf(treasury),
      // };
      await this.decks.withdrawReward(this.stakeId, { from: alice });

      // const balanceAfter = {
      //   alice: await this.token0.balanceOf(alice),
      //   treasury: await this.token0.balanceOf(treasury),
      // };
    });
  });

  context('withdraw() function', () => {

    beforeEach(async () => {
      this.depositTx = await this.decks.deposit(0, '20' + e18, { from: alice });
      this.stakeId = this.depositTx.logs[0].args.stakeId;
      this.depositTime = (await web3.eth.getBlock('latest')).timestamp;
    });

    it('shall withdraw amount due after stake period passes', async () => {
      await time.increase(2 * 3600 + 300);
      const act = await this.decks.getAmountDue(alice, this.stakeId);

      // console.log(JSON.stringify(this.depositTx.logs[0].event));
      // console.log(JSON.stringify(this.depositTx.logs[0].args));
      // console.log(alice);
      // console.log(this.stakeId.toString(16));
      // console.log(this.depositTime.toString(16));
      // console.log(act.totalDue.toString(), act.rewardDue.toString());
      // console.log(JSON.stringify(await this.decks.stakeData(alice, this.stakeId)));

      assert.equal(act.totalDue.toString(), '22' + e18);
      assert.equal(act.rewardDue.toString(), '2' + e18);

      const balanceBefore = {
        alice: await this.token0.balanceOf(alice),
        treasury: await this.token0.balanceOf(treasury),
      };
      await this.decks.withdraw(this.stakeId, { from: alice });

      const balanceAfter = {
        alice: await this.token0.balanceOf(alice),
        treasury: await this.token0.balanceOf(treasury),
      };

      assert.equal(balanceBefore.treasury.sub(balanceAfter.treasury).toString(), '22' + e18);
      assert.equal(balanceAfter.alice.sub(balanceBefore.alice).toString(), '22' + e18);
    });

    it('shall revert call until stake period passes', async () => {
      await time.increase(1 * 3600 + 20);
      const act = await this.decks.getAmountDue(alice, this.stakeId);
      assert.equal(act.totalDue.gt(BN('20' + e18)), true);

      await expectRevert(
        this.decks.withdraw(this.stakeId, { from: alice }),
        "withdraw: stake is locked"
      );
    });
  });

  context('emergencyWithdraw() function', () => {

    beforeEach(async () => {
      this.depositTx = await this.decks.deposit(4, '20' + e18, { from: alice });
      this.stakeId = this.depositTx.logs[0].args.stakeId;
      this.depositTime = (await web3.eth.getBlock('latest')).timestamp;
    });

    context('if emergency withdraw enabled', () => {
      before(async () => {
        assert.equal(await this.decks.emergencyWithdrawEnabled(), true);
        assert.equal((await this.decks.emergencyFeesFactor()).toString(), '500');
      });

      it('shall reverts a call from account that is NOT stake holder', async () => {
        await expectRevert(
            this.decks.emergencyWithdraw(this.stakeId,  { from: bob }),
            "QDeck:unknown or returned stake",
        );
      });

      it('shall allow emergency withdraw to stake holder', async () => {
        await this.decks.emergencyWithdraw(this.stakeId,  { from: alice });
      });

      context('on emergency withdraw', () => {

        beforeEach(async () => {
          this.balanceBefore = {
            alice: await this.token0.balanceOf(alice),
            treasury: await this.token0.balanceOf(treasury),
          };

          this.eWithdrawTx = await this.decks.emergencyWithdraw(this.stakeId,  { from: alice });

          this.balanceAfter = {
            alice: await this.token0.balanceOf(alice),
            treasury: await this.token0.balanceOf(treasury),
          };
        });

        it('shall transfer deposited amount less fees from treasury account', async () => {
          assert.equal(
              this.balanceBefore.treasury.sub(this.balanceAfter.treasury).toString(),
              `${20 * 19 / 20}` + e18, // less 5%
          );
        });

        it('shall transfer deposited amount less fees to user account', async () => {
          assert.equal(
              this.balanceAfter.alice.sub(this.balanceBefore.alice).toString(),
              `${20 * 19 / 20}` + e18, // less 5%
          );
        });

        it('shall emit EmergencyWithdraw event with valid params', async () => {
          assert.equal(this.eWithdrawTx.logs[0].event, 'EmergencyWithdraw');
          assert.equal(this.eWithdrawTx.logs[0].args.user.toLowerCase(), alice.toLowerCase());
          assert.equal(this.eWithdrawTx.logs[0].args.stakeId.toString(), this.stakeId.toString());
          assert.equal(this.eWithdrawTx.logs[0].args.amount.toString(), `${20 * 19 / 20}` + e18);
          assert.equal(this.eWithdrawTx.logs[0].args.fees.toString(), `${20 / 20}` + e18);
        });

        it('shall set zero amount for the stake', async () => {
          assert.equal((await this.decks.stakeData(alice, this.stakeId))[0].toString(), '0');
        });
      });

    });

    context('if emergency withdraw disabled', () => {
      before(async () => {
        await this.decks.disableEmergencyWithdraw();
        assert.equal(await this.decks.emergencyWithdrawEnabled(), false);
      });

      it('shall revert emergency withdraw for stake holder', async () => {
        await expectRevert(
          this.decks.emergencyWithdraw(this.stakeId,  { from: alice }),
          "withdraw: emergency disabled",
        );
      });
    });

  });

});

function getTermSheetsArr(token0, token1, token2) {
  return [
    { // termsId: 0
      minAmount: '10' + e18,
      maxAmountFactor: `${5e4}`,
      rewardFactor: '1100000',
      lockHours: 2,
      rewardLockHours: 1,
      token: token0,
      enabled: true,
    },
    {  // termsId: 1
      minAmount: '11' + e18,
      maxAmountFactor: 0,
      rewardFactor: '1200000',
      lockHours: 1,
      rewardLockHours: 0,
      token: token1,
      enabled: true,
    },
    { // termsId: 2
      minAmount: '12' + e18,
      maxAmountFactor: `${5e4}`,
      rewardFactor: '1100000',
      lockHours: 24,
      rewardLockHours: 1,
      token: token2,
      enabled: false,
    },
    { // termsId: 3
      minAmount: '13' + e18,
      maxAmountFactor: `${5e4}`,
      rewardFactor: '1100000',
      lockHours: 24,
      rewardLockHours: 1,
      token: token1,
      enabled: true,
    },
    { // termsId: 4
      minAmount: '14' + e18,
      maxAmountFactor: `${5e4}`,
      rewardFactor: '1100000',
      lockHours: 24 * 30,
      rewardLockHours: 1,
      token: token0,
      enabled: true,
    }
  ];
}
