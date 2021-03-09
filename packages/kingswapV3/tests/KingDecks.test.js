/* global artifacts, asert, before, beforeEach, context, contract */
const { expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');

const KingDecks = artifacts.require('MockKingDecks');
const MockERC20 = artifacts.require('MockERC20');
const MockERC721 = artifacts.require('MockERC721');

const { toBN } = (web3 ? web3 : require('web3')).utils;

contract('KingDecks', (accounts) => {
  const e18 = '000000000000000000';
  const e15 = '000000000000000';
  const [ deployer, treasury, alice, bob, , anybody ] = accounts;

  const limits = [
    { // 0: id = 1
      minAmount: '10'+e18,
      maxAmountFactor: '0' // max amount unlimited
    },
    { // 1: id = 2
      minAmount: '10'+e18,
      maxAmountFactor: '50'+'0000' // scaled by 1e4
    },
    { // 2: id = 3
      minAmount: '1',
      maxAmountFactor: '2'+'0000' // scaled by 1e4
    },
    { // 3: id = 4
      minAmount: `${1e6}`+e18,
      maxAmountFactor: '1000'+'0000'
    },
  ];

  const getSampleTermSheet = (params = {}) => Object.assign({
    availableQty: 255,
    inTokenId: 33,
    nfTokenId: 34,
    outTokenId: 35,
    earlyRepayableShare: 192,
    earlyWithdrawFees: 64,
    limitId: 2,
    depositHours: 1000,
    minInterimHours: 1,
    rate: 3e8, // 0.3 scaled by 1e9
    allowedNftNumBitMask: parseInt('1010001',2),
  }, params);

  const getSampleDeposit = (maturityTime = 1000 * 3600 + 100, lastWithdrawTime = 100) => ({
    amountDue: '100'+e18,
    maturityTime,
    lastWithdrawTime,
    lockedShare: 192*(2**16 - 1)/255
  });

  context('_removeArrayElement internal function', () => {
    const els = [
      '108005765669190322414635507609697898386068044203237514870047565119433966354433',
      '108005765669190322414635507609697898386068044203237514870047565400908945031169',
      '113772348642185704331748229598741847809740133625785081752446362757204723236866'
    ]
    beforeEach(async () => {
      this.decks = await KingDecks.new(anybody);
      await this.decks.__addArrElements(els);
      assert.equal((await this.decks.__mockArrLength()).toString(), '3')
      assert.equal((await this.decks.__mockArr(0)).toString(), els[0])
      assert.equal((await this.decks.__mockArr(1)).toString(), els[1])
      assert.equal((await this.decks.__mockArr(2)).toString(), els[2])
    });

    it('Should remove the 1st element', async () => {
      await this.decks.__removeArrayElement(els[0])

      assert.equal((await this.decks.__mockArrLength()).toString(), '2')
      assert.equal((await this.decks.__mockArr(0)).toString(), els[1])
      assert.equal((await this.decks.__mockArr(1)).toString(), els[2])
    });

    it('Should remove the 2nd element', async () => {
      await this.decks.__removeArrayElement(els[1])

      assert.equal((await this.decks.__mockArrLength()).toString(), '2')
      assert.equal((await this.decks.__mockArr(0)).toString(), els[0])
      assert.equal((await this.decks.__mockArr(1)).toString(), els[2])
    });

    it('Should remove the last element', async () => {
      await this.decks.__removeArrayElement(els[2])

      assert.equal((await this.decks.__mockArrLength()).toString(), '2')
      assert.equal((await this.decks.__mockArr(0)).toString(), els[0])
      assert.equal((await this.decks.__mockArr(1)).toString(), els[1])
    });

    it('Should remove all elements', async () => {
      await this.decks.__removeArrayElement(els[1])
      assert.equal((await this.decks.__mockArrLength()).toString(), '2')
      assert.equal((await this.decks.__mockArr(0)).toString(), els[0])
      assert.equal((await this.decks.__mockArr(1)).toString(), els[2])

      await this.decks.__removeArrayElement(els[0])
      assert.equal((await this.decks.__mockArrLength()).toString(), '1')
      assert.equal((await this.decks.__mockArr(0)).toString(), els[2])

      await this.decks.__removeArrayElement(els[0])
      assert.equal((await this.decks.__mockArrLength()).toString(), '0')
    });

    it('Should remove all elements (#2)', async () => {
      await this.decks.__removeArrayElement(els[0])
      assert.equal((await this.decks.__mockArrLength()).toString(), '2')
      assert.equal((await this.decks.__mockArr(0)).toString(), els[1])
      assert.equal((await this.decks.__mockArr(1)).toString(), els[2])

      await this.decks.__removeArrayElement(els[1])
      assert.equal((await this.decks.__mockArrLength()).toString(), '1')
      assert.equal((await this.decks.__mockArr(0)).toString(), els[2])

      await this.decks.__removeArrayElement(els[2])
      assert.equal((await this.decks.__mockArrLength()).toString(), '0')
    });

    it('Should remove all elements (#3)', async () => {
      await this.decks.__removeArrayElement(els[2])
      assert.equal((await this.decks.__mockArrLength()).toString(), '2')
      assert.equal((await this.decks.__mockArr(0)).toString(), els[0])
      assert.equal((await this.decks.__mockArr(1)).toString(), els[1])

      await this.decks.__removeArrayElement(els[1])
      assert.equal((await this.decks.__mockArrLength()).toString(), '1')
      assert.equal((await this.decks.__mockArr(0)).toString(), els[0])

      await this.decks.__removeArrayElement(els[0])
      assert.equal((await this.decks.__mockArrLength()).toString(), '0')
    });

    it('Should remove 12 elements', async () => {
      await this.decks.__addArrElements([ '3', '4', '5', '6', '7', '8', '9', '10', '11' ]);
      assert.equal((await this.decks.__mockArrLength()).toString(), '12')

      await this.decks.__removeArrayElement(els[0])
      await this.decks.__removeArrayElement('7')
      await this.decks.__removeArrayElement('3')
      await this.decks.__removeArrayElement('11')
      await this.decks.__removeArrayElement(els[1])
      assert.equal((await this.decks.__mockArrLength()).toString(), '7')
      assert.equal((await this.decks.__mockArr(0)).toString(), els[2])
      assert.equal((await this.decks.__mockArr(5)).toString(), '9')

      await this.decks.__removeArrayElement(els[2])
      await this.decks.__removeArrayElement('4')
      await this.decks.__removeArrayElement('5')
      await this.decks.__removeArrayElement('10')
      await this.decks.__removeArrayElement('9')
      await this.decks.__removeArrayElement('8')
      assert.equal((await this.decks.__mockArrLength()).toString(), '1')
      assert.equal((await this.decks.__mockArr(0)).toString(), '6')

      await this.decks.__removeArrayElement('6')
      assert.equal((await this.decks.__mockArrLength()).toString(), '0')
    });
  });

  context('_amountOut internal function', () => {
    before(async () => {
      this.decks = await KingDecks.new(anybody);
    });

    it('Should work given a minimum rate of 1-e9', async () => {
      // note, `rate` is scaled up (multiplied) by `1e9`
      assert.equal((await this.decks.__amountOut(1, 1, 0, 0)).toString(), '0');
      assert.equal((await this.decks.__amountOut(1, 1, 18, 18)).toString(), '0');
      assert.equal((await this.decks.__amountOut(1, 1, 6, 18)).toString(), '1000');
    });

    it('Should work given a rate of exactly 1.0', async () => {
      assert.equal((await this.decks.__amountOut(1, 1e9, 0, 0)).toString(), '1');
      assert.equal((await this.decks.__amountOut(1, 1e9, 18, 18)).toString(), '1');
      assert.equal((await this.decks.__amountOut(1, 1e9, 18, 6)).toString(), '0');
      assert.equal((await this.decks.__amountOut(1, 1e9, 0, 6)).toString(), '1000000');

    });

    it('Should work given an input amount decimals of 18', async () => {
      assert.equal((await this.decks.__amountOut('1'+e18, 1e9, 18, 6)).toString(), '1000000');
      assert.equal((await this.decks.__amountOut('1'+e18, 2e9, 18, 6)).toString(), '2000000');
      assert.equal((await this.decks.__amountOut('1'+e18, 5e8, 18, 6)).toString(), '500000');
      assert.equal((await this.decks.__amountOut('1'+e18, 1, 18, 6)).toString(), '0');
      assert.equal((await this.decks.__amountOut('1000'+e18, 1, 18, 6)).toString(), '1');
      assert.equal((await this.decks.__amountOut('1000'+e18, 1e9, 18, 6)).toString(), '1000000000');
      assert.equal((await this.decks.__amountOut('1000000000'+e18, 1e9, 18, 6)).toString(), '1000000000000000');
      assert.equal((await this.decks.__amountOut('1'+e18, '1'+e18, 18, 6)).toString(), '1000000000000000');

    });

    it('Should work given an input amount decimals of 6', async () => {
      assert.equal((await this.decks.__amountOut(1e12, 1, 6, 18)).toString(), '1000000000000000');
      assert.equal((await this.decks.__amountOut(1e6, 1e9, 6, 18)).toString(), '1000000000000000000');
      assert.equal((await this.decks.__amountOut(1e12, 1e9, 6, 18)).toString(), '1000000000000000000000000');
      assert.equal((await this.decks.__amountOut(1e6, 1e12, 6, 18)).toString(), '1000000000000000000000');
      assert.equal((await this.decks.__amountOut(1e6, 1e14, 6, 18)).toString(), '100000000000000000000000');
      assert.equal((await this.decks.__amountOut(1e6, 1e15, 6, 18)).toString(), '1000000000000000000000000');
    });
  });

  context('_computeEarlyWithdrawal internal function', () => {
    before(async () => {
      this.decks = await KingDecks.new(anybody);
      this.sampleDeposit = getSampleDeposit();
      this.sampleTermSheet = getSampleTermSheet();
    });

    it('Should return zeros for t == lastWithdrawTime', async () => {
      const { amountToUser, fees } = await this.decks.__computeEarlyWithdrawal(
          this.sampleDeposit, this.sampleTermSheet, this.sampleDeposit.lastWithdrawTime.toString()
      );
      assert.equal(amountToUser.toString(), '0');
      assert.equal(fees.toString(), '0');
    });

    it('Should return zeros for t == maturityTime', async () => {
      const { amountToUser, fees } = await this.decks.__computeEarlyWithdrawal(
          this.sampleDeposit, this.sampleTermSheet, this.sampleDeposit.maturityTime.toString()
      );
      assert.equal(amountToUser.toString(), '0');
      assert.equal(fees.toString(), '0');
    });

    it('Should return zeros for t > maturityTime', async () => {
      const { amountToUser, fees } = await this.decks.__computeEarlyWithdrawal(
          this.sampleDeposit, this.sampleTermSheet, (this.sampleDeposit.maturityTime + 1).toString()
      );
      assert.equal(amountToUser.toString(), '0');
      assert.equal(fees.toString(), '0');
    });

    it('Should return non-zero values for lastWithdrawTime < t < maturityTime', async () => {
      const { amountToUser, fees } = await this.decks.__computeEarlyWithdrawal(
          this.sampleDeposit, this.sampleTermSheet, (this.sampleDeposit.maturityTime - 1).toString()
      );
      assert.equal(amountToUser.gt(toBN(0)), true);
      assert.equal(fees.gt(toBN(0)), true);
    });

    context('with earlyRepayableShare of 100% and earlyWithdrawFees of 0%', () => {
      before(async () => {
        this.sampleTermSheet2 = getSampleTermSheet();
        this.sampleTermSheet2.earlyRepayableShare = 255; // 100% in 1/255 parts
        this.sampleTermSheet2.earlyWithdrawFees = 0;
        this.sampleTermSheet2.depositHours = 1000;

        this.sampleDeposit2 = getSampleDeposit(1000 * 3600 + 100, 100);
        this.sampleDeposit2.amountDue = '100'+e18;
        this.sampleDeposit2.lockedShare = 0; // (255-255)*65535/255
      });

      it('Should return 25% of amountDue as amountToUser when 1/4 deposit period passes', async () => {
        const { amountToUser, fees, newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${900 * 1000 + 100}`
        );
        assert.equal(amountToUser.toString(), '25'+e18);
        assert.equal(fees.toString(), '0');
        assert.equal(newlockedShare.toString(), '0');
      });

      it('Should return 50% of amountDue as amountToUser when 1/2 deposit period passes', async () => {
        const { amountToUser, fees, newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${1800 * 1000 + 100}`
        );
        assert.equal(amountToUser.toString(), '50'+e18);
        assert.equal(fees.toString(), '0');
        assert.equal(newlockedShare.toString(), '0');
      });

      it('Should return 75% of amountDue as amountToUser when 3/4 deposit period passes', async () => {
        const { amountToUser, fees, newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${2700 * 1000 + 100}`
        );
        assert.equal(amountToUser.toString(), '75'+e18);
        assert.equal(fees.toString(), '0');
        assert.equal(newlockedShare.toString(), '0');
      });
    });

    context('with earlyRepayableShare of 40% and earlyWithdrawFees of 0%', () => {
      before(async () => {
        this.sampleTermSheet2 = getSampleTermSheet();
        this.sampleTermSheet2.earlyRepayableShare = 102; // 40% in 1/255 parts
        this.sampleTermSheet2.earlyWithdrawFees = 0;
        this.sampleTermSheet2.depositHours = 1000;

        this.sampleDeposit2 = getSampleDeposit(1000 * 3600 + 100, 100);
        this.sampleDeposit2.amountDue = '100'+e18;
        this.sampleDeposit2.lockedShare = 39321 // (255-102)*65535/255
      });

      it('Should return 10% of amountDue as amountToUser when 1/4 deposit period passes', async () => {
        const { amountToUser, fees, newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${900 * 1000 + 100}`
        );
        assert.equal(amountToUser.toString(), '10'+e18);
        assert.equal(fees.toString(), '0');
        // non-repayable-early amount: (100%-40%)*amount_due; new amount due: (100%-10%)*amount_due
        assert.equal(newlockedShare.toString(), parseInt(`${60e18*65535/90e18}`).toString());
      });

      it('Should return 20% of amountDue as amountToUser when 1/2 deposit period passes', async () => {
        const { amountToUser, fees, newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${1800 * 1000 + 100}`
        );
        assert.equal(amountToUser.toString(), '20'+e18);
        assert.equal(fees.toString(), '0');
        // non-repayable-early amount: (100%-40%)*amount_due; new amount due: (100%-20%)*amount_due
        assert.equal(newlockedShare.toString(), parseInt(`${60e18*65535/80e18 + 1}`).toString());
      });

      it('Should return 30% of amountDue as amountToUser when 3/4 deposit period passes', async () => {
        const { amountToUser, fees, newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${2700 * 1000 + 100}`
        );
        assert.equal(amountToUser.toString(), '30'+e18);
        assert.equal(fees.toString(), '0');
        // non-repayable-early amount: (100%-40%)*amount_due; new amount due: (100%-30%)*amount_due
        assert.equal(newlockedShare.toString(), parseInt(`${60e18*65535/70e18 + 1}`).toString());
      });
    });

    context('with earlyRepayableShare of 100% and earlyWithdrawFees of 20%', () => {
      before(async () => {
        this.sampleTermSheet2 = getSampleTermSheet();
        this.sampleTermSheet2.earlyRepayableShare = 255; // 100% in 1/255 parts
        this.sampleTermSheet2.earlyWithdrawFees = 51; // 20% in 1/255 parts
        this.sampleTermSheet2.depositHours = 1000;

        this.sampleDeposit2 = getSampleDeposit(1000 * 3600 + 100, 100);
        this.sampleDeposit2.amountDue = '100'+e18;
        this.sampleDeposit2.lockedShare = 0; // (255-255)*65535/255
      });

      it('Should return 15% of 25% of amountDue as fees when 1/4 deposit period passes', async () => {
        const { amountToUser, fees, newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${900 * 1000 + 100}`
        );
        assert.equal(amountToUser.toString(), '21250'+e15);
        assert.equal(fees.toString(), '3750'+e15);
        // non-repayable-early amount: 0%
        assert.equal(newlockedShare.toString(), '0');
      });

      it('Should return 10% of 50% of amountDue as fees when 1/2 deposit period passes', async () => {
        const { amountToUser, fees, newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${1800 * 1000 + 100}`
        );
        assert.equal(amountToUser.toString(), '45'+e18);
        assert.equal(fees.toString(), '5'+e18);
        // non-repayable-early amount: 0%
        assert.equal(newlockedShare.toString(), '0');
      });

      it('Should return 5% of 75% of amountDue as fees when 3/4 deposit period passes', async () => {
        const { amountToUser, fees, newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${2700 * 1000 + 100}`
        );
        assert.equal(amountToUser.toString(), '71250'+e15);
        assert.equal(fees.toString(), '3750'+e15);
        // non-repayable-early amount: 0%
        assert.equal(newlockedShare.toString(), '0');
      });

      it('Should return 0 as newlockedShare a second before the maturity time', async () => {
        const { newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${3600 * 1000 + 99}`
        );
        // non-repayable-early amount: 0%
        assert.equal(newlockedShare.toString(), '0');
      });
    });

    context('with earlyRepayableShare of 40% and earlyWithdrawFees of 20%', () => {
      before(async () => {
        this.sampleTermSheet2 = getSampleTermSheet();
        this.sampleTermSheet2.earlyRepayableShare = 102; // 40% in 1/255 parts
        this.sampleTermSheet2.earlyWithdrawFees = 51; // 20% in 1/255 parts
        this.sampleTermSheet2.depositHours = 1000;

        this.sampleDeposit2 = getSampleDeposit(1000 * 3600 + 100, 100);
        this.sampleDeposit2.amountDue = '100'+e18;
        this.sampleDeposit2.lockedShare = 39321 // (255-102)*65535/255
      });

      it('Should return 15% of 10% of amountDue as fees when 1/4 deposit period passes', async () => {
        const { amountToUser, fees, newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${900 * 1000 + 100}`
        );
        assert.equal(amountToUser.toString(), '8500'+e15);
        assert.equal(fees.toString(), '1500'+e15);
        // non-repayable-early amount: (100%-40%)*amount_due; new amount due: (100%-10%)*amount_due
        assert.equal(newlockedShare.toString(), parseInt(`${60e18*65535/90e18}`).toString());
      });

      it('Should return 10% of 20% of amountDue as fees when 1/2 deposit period passes', async () => {
        const { amountToUser, fees, newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${1800 * 1000 + 100}`
        );
        assert.equal(amountToUser.toString(), '18000'+e15);
        assert.equal(fees.toString(), '2000'+e15);
        // non-repayable-early amount: (100%-40%)*amount_due; new amount due: (100%-20%)*amount_due
        assert.equal(newlockedShare.toString(), parseInt(`${60e18*65535/80e18 + 1}`).toString());
      });

      it('Should return 5% of 30% of amountDue as fees when 3/4 deposit period passes', async () => {
        const { amountToUser, fees, newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${2700 * 1000 + 100}`
        );
        assert.equal(amountToUser.toString(), '28500'+e15);
        assert.equal(fees.toString(), '1500'+e15);
        // non-repayable-early amount: (100%-40%)*amount_due; new amount due: (100%-30%)*amount_due
        assert.equal(newlockedShare.toString(), parseInt(`${60e18*65535/70e18 + 1}`).toString());
      });

      it('Should return ~65535 as newlockedShare a second before the maturity time', async () => {
        const { newlockedShare } = await this.decks.__computeEarlyWithdrawal(
            this.sampleDeposit2,
            this.sampleTermSheet2,
            `${3600 * 1000 + 99}`
        );
        // non-repayable-early amount: 0%
        assert.equal(newlockedShare.toString(), '65535');
      });
    });
  });

  context('For the test scenario coded', () => {
    before(async () => {
      this.decks = await KingDecks.new(treasury);

      this.token0 = await MockERC20.new("token0", "T0", `${1e6}` + e18)
      await this.token0.transfer(treasury, `${0.1e6}` + e18);
      await this.token0.transfer(alice, `${0.1e6}` + e18);
      await this.token0.transfer(bob, `${0.1e6}` + e18);

      this.token1 = await MockERC20.new("token1", "T1", `${1e6}` + e18)
      await this.token1.transfer(treasury, `${0.1e6}` + e18);
      await this.token1.transfer(alice, `${0.1e6}` + e18);
      await this.token1.transfer(bob, `${0.1e6}` + e18);

      this.token2 = await MockERC20.new("token2", "T2", `${1e6}` + e18)
      await this.token2.transfer(treasury, `${0.1e6}` + e18);
      await this.token2.transfer(bob, `${0.1e6}` + e18);

      await this.token0.approve(this.decks.address, `${0.1e6}` + e18, { from: alice });
      await this.token0.approve(this.decks.address, `${0.1e6}` + e18, { from: bob });
      await this.token0.approve(this.decks.address, `${0.2e6}` + e18, { from: treasury });

      await this.token1.approve(this.decks.address, `${0.1e6}` + e18, { from: alice });
      await this.token1.approve(this.decks.address, `${0.1e6}` + e18, { from: bob });
      await this.token1.approve(this.decks.address, `${0.2e6}` + e18, { from: treasury });

      await this.token2.approve(this.decks.address, `${0.1e6}` + e18, { from: bob });
      await this.token2.approve(this.decks.address, `${0.2e6}` + e18, { from: treasury });

      this.nft = await MockERC721.new("Mock NFT", "NFT", deployer, 16)
      await this.nft.safeTransferFrom(deployer, alice, 1, '0x0')
      await this.nft.safeTransferFrom(deployer, bob, 5, '0x0')
      await this.nft.safeTransferFrom(deployer, bob, 7, '0x0')
      await this.nft.safeTransferFrom(deployer, bob, 12, '0x0')

      this.sampleDeposit = getSampleDeposit();
      this.sampleTermSheet = getSampleTermSheet();
    });

    before(async () => {
      await this.decks.addLimits(limits);
      await this.decks.addTokens(
          // ID = 33,            ID = 34,          ID = 35,             ID = 36
          [ this.token0.address, this.nft.address, this.token1.address, this.token2.address ],
          [       1 /* Erc20 */,   2 /* Erc721 */,       1 /* Erc20 */,       1 /* Erc20 */ ],
          [ /* decimals */   18,                0,                  18,                   6 ],
      );
      await this.decks.addTerms([
        /*ID=1*/ getSampleTermSheet(
          { inTokenId: 33, outTokenId: 35, nfTokenId: 34, depositHours: 1, limitId: 1, rate: 1e7}
        ),
        /*ID=2*/ getSampleTermSheet(
          { inTokenId: 33, outTokenId: 36, nfTokenId: 0, depositHours: 1, limitId: 2, rate: 2e9, minInterimHours: 0 }
        ),
      ]);
    });

    it('Should register limits with the contract', async () => {
      assert.equal((await this.decks.depositLimitsNum()).toString(), `${ limits.length }`);
      assert.equal(
          (await this.decks.depositLimit(2)).maxAmountFactor.toString(),
          limits[1].maxAmountFactor
      );
    });

    it('Should know mainnet addresses of $KING and DAI tokens', async () => {
      assert.equal(
          (await this.decks.getTokenData(1))[0].toLowerCase(),
          ('0x5a731151d6510Eb475cc7a0072200cFfC9a3bFe5').toLowerCase()
      );
      assert.equal(
          (await this.decks.getTokenData(4))[0].toLowerCase(),
          ('0x6B175474E89094C44Da98b954EedeAC495271d0F').toLowerCase()
      );
    });

    it('Should register tokens with the contract', async () => {
      assert.equal((await this.decks.getTokenData(33))[0].toLowerCase(), this.token0.address.toLowerCase());
      assert.equal((await this.decks.getTokenData(34))[0].toLowerCase(), this.nft.address.toLowerCase());
      assert.equal((await this.decks.getTokenData(35))[0].toLowerCase(), this.token1.address.toLowerCase());
      assert.equal((await this.decks.getTokenData(36))[0].toLowerCase(), this.token2.address.toLowerCase());
    });

    it('Should register term sheets with the contract', async () => {
      assert.equal((await this.decks.termSheetsNum()).toString(), '2');
      assert.equal((await this.decks.termSheet(2)).outTokenId.toString(), '36');
    });

    it('Should define if an NFT instance is acceptable under a term sheet', async () => {
      assert.equal(await this.decks.isAcceptableNft('1', this.nft.address, '3'), false);
      assert.equal(await this.decks.isAcceptableNft('1', this.nft.address, '5'), true);
      assert.equal(await this.decks.isAcceptableNft('1', this.nft.address, '7'), true);
    });

    it('Should accept a deposit under the TermSheet #2', async () => {
      const balances = {
        beforeContractInToken: await this.token0.balanceOf(this.decks.address),
        beforeAliceInToken: await this.token0.balanceOf(alice),
        beforeTreasuryInToken: await this.token0.balanceOf(treasury),
      };

      const r = await this.decks.deposit(2, '10'+e18, 0, { from: alice });
      const depositedAt = (await web3.eth.getBlock('latest')).timestamp;

      balances.afterContractInToken = await this.token0.balanceOf(this.decks.address);
      balances.afterAliceInToken =  await this.token0.balanceOf(alice);
      balances.afterTreasuryInToken = await this.token0.balanceOf(treasury);
      const log = expectEvent(r, 'NewDeposit');
      const depositId = log.args.depositId.toString();

      assert.equal(log.args.user.toLowerCase(), alice.toLowerCase());
      assert.equal(log.args.inTokenId.toString(), '33');
      assert.equal(log.args.outTokenId.toString(), '36');
      assert.equal(log.args.termsId.toString(), '2');
      assert.equal(log.args.amount.toString(), '10'+e18);
      assert.equal(log.args.amountDue.toString(), `${20e6}`);
      assert.equal(log.args.maturityTime.toString(), `${3600 + depositedAt }`);

      const deposit = await this.decks.depositData(alice, depositId);
      assert.equal(deposit.termsId.toString(), '2');
      assert.equal(deposit.params.amountDue.toString(), log.args.amountDue.toString());
      assert.equal(deposit.params.maturityTime.toString(), log.args.maturityTime.toString());
      assert.equal(deposit.params.lastWithdrawTime.toString(), `${ depositedAt }`);

      assert.equal((await this.decks.totalDue('36')).toString(), `${20e6}`);

      assert.equal(
          balances.beforeContractInToken.sub(balances.afterContractInToken).toString(),
          '0'
      );
      assert.equal(
          balances.beforeAliceInToken.sub(balances.afterAliceInToken).toString(),
          '10'+e18
      );
      assert.equal(
          balances.afterTreasuryInToken.sub(balances.beforeTreasuryInToken).toString(),
          '10'+e18
      );
    });

    it('Should repay a deposit under the TermSheet #2', async () => {
      const r1 = await this.decks.deposit(2, '10' + e18, 0, { from: alice });
      const log1 = expectEvent(r1, 'NewDeposit');
      const depositId = log1.args.depositId.toString();
      const depositedAt = (await web3.eth.getBlock('latest')).timestamp;
      const balances = {
        beforeContractOutToken: await this.token2.balanceOf(this.decks.address),
        beforeAliceOutToken: await this.token2.balanceOf(alice),
        beforeTreasuryOutToken: await this.token2.balanceOf(treasury),
      };

      await time.increaseTo(3600 + 10 + depositedAt);

      await expectRevert(
          this.decks.withdraw(depositId, { from: bob }),
          'KDecks:unknown or repaid deposit');
      const r2 = await this.decks.withdraw(depositId, { from: alice });
      const log2 = expectEvent(r2, 'Withdraw');
      balances.afterContractOutToken = await this.token2.balanceOf(this.decks.address);
      balances.afterAliceOutToken =  await this.token2.balanceOf(alice);
      balances.afterTreasuryOutToken = await this.token2.balanceOf(treasury);

      assert.equal(log2.args.amount.toString(), `${20e6}`);
      assert.equal(
          balances.beforeContractOutToken.sub(balances.afterContractOutToken).toString(),
          '0');
      assert.equal(
          balances.afterAliceOutToken.sub(balances.beforeAliceOutToken).toString(),
          `${20e6}`);
      assert.equal(
          balances.beforeTreasuryOutToken.sub(balances.afterTreasuryOutToken).toString(),
          `${20e6}`);
    });

    it('Should allow early withdraw then repay a deposit under the TermSheet #2', async () => {
      const r1 = await this.decks.deposit(2, '10' + e18, 0, { from: alice });
      const log1 = expectEvent(r1, 'NewDeposit');
      const depositId = log1.args.depositId.toString();
      const depositedAt = (await web3.eth.getBlock('latest')).timestamp;
      const balances = {
        beforeContractOutToken: await this.token2.balanceOf(this.decks.address),
        beforeAliceOutToken: await this.token2.balanceOf(alice),
        beforeTreasuryOutToken: await this.token2.balanceOf(treasury),
      };

      await time.increaseTo(1800 + depositedAt);

      await expectRevert(
          this.decks.interimWithdraw(depositId, { from: bob }),
          'KDecks:unknown or repaid deposit');
      await expectRevert(
          this.decks.withdraw(depositId, { from: alice }),
          'KDecks:deposit is locked');

      const r2 = await this.decks.interimWithdraw(depositId, { from: alice });
      const log2 = expectEvent(r2, 'InterimWithdraw');

      await time.increaseTo(3600 + depositedAt + 10);

      const r3 = await this.decks.interimWithdraw(depositId, { from: alice });
      const log3 = expectEvent(r3, 'InterimWithdraw');

      const r4 = await this.decks.withdraw(depositId, { from: alice });
      const log4 = expectEvent(r4, 'Withdraw');
      balances.afterContractOutToken = await this.token2.balanceOf(this.decks.address);
      balances.afterAliceOutToken =  await this.token2.balanceOf(alice);
      balances.afterTreasuryOutToken = await this.token2.balanceOf(treasury);

      const userAmount = log2.args.amount;
      const fees = log2.args.fees;
      const remaining = log4.args.amount;

      assert.equal(log3.args.amount.toString(), '0');
      assert.equal(log3.args.fees.toString(), '0');

      assert.equal(userAmount.gt(toBN('6584000')) && userAmount.lt(toBN('6590000')), true);
      assert.equal(fees.gt(toBN('944000')) && fees.lt(toBN('945000')), true);
      assert.equal(remaining.toString(), toBN(`${20e6}`).sub(userAmount).sub(fees));

      assert.equal(
          balances.beforeContractOutToken.sub(balances.afterContractOutToken).toString(),
          '0');
      assert.equal(
          balances.afterAliceOutToken.sub(balances.beforeAliceOutToken).toString(),
          toBN(`${20e6}`).sub(fees).toString());
      assert.equal(
          balances.beforeTreasuryOutToken.sub(balances.afterTreasuryOutToken).toString(),
          toBN(`${20e6}`).sub(fees).toString());
    });

    it('Should allow multiple early withdrawals under the TermSheet #2', async () => {
      const r1 = await this.decks.deposit(2, '10' + e18, 0, { from: alice });
      const log1 = expectEvent(r1, 'NewDeposit');
      const depositId = log1.args.depositId.toString();
      const depositedAt = (await web3.eth.getBlock('latest')).timestamp;
      const balances = {
        beforeContractOutToken: await this.token2.balanceOf(this.decks.address),
        beforeAliceOutToken: await this.token2.balanceOf(alice),
        beforeTreasuryOutToken: await this.token2.balanceOf(treasury),
      };

      await time.increaseTo(60 + depositedAt);
      const r2 = await this.decks.interimWithdraw(depositId, { from: alice });
      const log2 = expectEvent(r2, 'InterimWithdraw');

      await time.increaseTo(900 + depositedAt);
      const r3 = await this.decks.interimWithdraw(depositId, { from: alice });
      const log3 = expectEvent(r3, 'InterimWithdraw');

      await time.increaseTo(1800 + depositedAt);
      const r4 = await this.decks.interimWithdraw(depositId, { from: alice });
      const log4 = expectEvent(r4, 'InterimWithdraw');

      await time.increaseTo(2700 + depositedAt);
      const r5 = await this.decks.interimWithdraw(depositId, { from: alice });
      const log5 = expectEvent(r5, 'InterimWithdraw');

      await time.increaseTo(3600 + depositedAt + 10);

      const r6 = await this.decks.interimWithdraw(depositId, { from: alice });
      const log6 = expectEvent(r6, 'InterimWithdraw');

      await this.decks.withdraw(depositId, { from: alice });
      balances.afterContractOutToken = await this.token2.balanceOf(this.decks.address);
      balances.afterAliceOutToken =  await this.token2.balanceOf(alice);
      balances.afterTreasuryOutToken = await this.token2.balanceOf(treasury);

      const fees = toBN(log2.args.fees)
        .add(log3.args.fees)
        .add(log4.args.fees)
        .add(log5.args.fees)

      assert.equal(fees.gt(toBN('1431500')) && fees.lt(toBN('1432500')), true);
      assert.equal(log6.args.amount.toString(), '0');
      assert.equal(log6.args.fees.toString(), '0');

      assert.equal(
          balances.beforeContractOutToken.sub(balances.afterContractOutToken).toString(),
          '0');
      assert.equal(
          balances.afterAliceOutToken.sub(balances.beforeAliceOutToken).toString(),
          toBN(`${20e6}`).sub(fees).toString());
      assert.equal(
          balances.beforeTreasuryOutToken.sub(balances.afterTreasuryOutToken).toString(),
          toBN(`${20e6}`).sub(fees).toString());
    });

    it('Should accept a deposit under the TermSheet #1', async () => {
      const balances = {
        beforeContractInToken: await this.token0.balanceOf(this.decks.address),
        beforeBobInToken: await this.token0.balanceOf(bob),
        beforeTreasuryInToken: await this.token0.balanceOf(treasury),
        beforeNftOwner: await this.nft.ownerOf('7'),
      };

      await this.nft.approve(this.decks.address, '7', { from: bob })
      const r = await this.decks.deposit(1, '100'+e18, 7, { from: bob });
      const log = expectEvent(r, 'NewDeposit');
      const depositId = log.args.depositId.toString();
      const depositedAt = (await web3.eth.getBlock('latest')).timestamp;

      balances.afterContractInToken = await this.token0.balanceOf(this.decks.address);
      balances.afterBobInToken =  await this.token0.balanceOf(bob);
      balances.afterTreasuryInToken = await this.token0.balanceOf(treasury);
      balances.afterNftOwner = await this.nft.ownerOf('7');

      assert.equal(log.args.user.toLowerCase(), bob.toLowerCase());
      assert.equal(log.args.inTokenId.toString(), '33');
      assert.equal(log.args.outTokenId.toString(), '35');
      assert.equal(log.args.termsId.toString(), '1');
      assert.equal(log.args.amount.toString(), '100'+e18);
      assert.equal(log.args.amountDue.toString(), '1'+e18);
      assert.equal(log.args.maturityTime.toString(), `${3600 + depositedAt }`);

      const deposit = await this.decks.depositData(bob, depositId);
      assert.equal(deposit.termsId.toString(), '1');
      assert.equal(deposit.params.amountDue.toString(), log.args.amountDue.toString());
      assert.equal(deposit.params.maturityTime.toString(), log.args.maturityTime.toString());
      assert.equal(deposit.params.lastWithdrawTime.toString(), `${ depositedAt }`);

      assert.equal((await this.decks.totalDue('35')).toString(), '1'+e18);

      assert.equal(
          balances.beforeContractInToken.sub(balances.afterContractInToken).toString(),
          '0');
      assert.equal(
          balances.beforeBobInToken.sub(balances.afterBobInToken).toString(),
          '100'+e18);
      assert.equal(
          balances.afterTreasuryInToken.sub(balances.beforeTreasuryInToken).toString(),
          '100'+e18);
      assert.equal(balances.beforeNftOwner.toLowerCase(), bob.toLowerCase());
      assert.equal(balances.afterNftOwner.toLowerCase(), this.decks.address.toLowerCase());
    });

    it('Should repay a deposit under the TermSheet #1', async () => {
      await this.nft.approve(this.decks.address, '5', { from: bob })
      const r1 = await this.decks.deposit(1, '100'+e18, '5', { from: bob });
      const log1 = expectEvent(r1, 'NewDeposit');
      const depositId = log1.args.depositId.toString();
      const depositedAt = (await web3.eth.getBlock('latest')).timestamp;
      const balances = {
        beforeContractOutToken: await this.token1.balanceOf(this.decks.address),
        beforeBobOutToken: await this.token1.balanceOf(bob),
        beforeTreasuryOutToken: await this.token1.balanceOf(treasury),
        beforeNftOwner: await this.nft.ownerOf('5'),
      };

      await time.increaseTo(3600 + 10 + depositedAt);

      await expectRevert(
          this.decks.withdraw(depositId, { from: alice }),
          'KDecks:unknown or repaid deposit');
      const r2 = await this.decks.withdraw(depositId, { from: bob });
      const log2 = expectEvent(r2, 'Withdraw');
      balances.afterContractOutToken = await this.token1.balanceOf(this.decks.address);
      balances.afterBobOutToken =  await this.token1.balanceOf(bob);
      balances.afterTreasuryOutToken = await this.token1.balanceOf(treasury);
      balances.afterNftOwner = await this.nft.ownerOf('5');

      assert.equal(log2.args.amount.toString(), '1'+e18);
      assert.equal(
          balances.beforeContractOutToken.sub(balances.afterContractOutToken).toString(),
          '0');
      assert.equal(balances.afterBobOutToken.sub(balances.beforeBobOutToken).toString(), '1'+e18);
      assert.equal(
          balances.beforeTreasuryOutToken.sub(balances.afterTreasuryOutToken).toString(),
          '1'+e18);
      assert.equal(balances.beforeNftOwner.toLowerCase(), this.decks.address.toLowerCase());
      assert.equal(balances.afterNftOwner.toLowerCase(), bob.toLowerCase());
    });
  });
});
