const RaffleDraw = artifacts.require('RaffleDraw');
const MockERC20 = artifacts.require('MockERC20');

contract('RaffleDraw', (accounts) => {
  const e18 = '000000000000000000';
  let pool;

  before(async () => {
    pool = accounts[9];
    this.king = await MockERC20.new("$KING", "$KING", '4000'+e18);
    this.raffle = await RaffleDraw.new(this.king.address, pool);

    // prepare $KING tokens for accounts[8]
    await this.king.transfer(accounts[8], '40'+e18, { from: accounts[0] });
    await this.king.approve(this.raffle.address, '40'+e18, { from: accounts[8] });

    // prepare $KING tokens for accounts[1..6]
    (new Array(6).fill(0)).reduce(
        (promises, _, i) => promises.then(
            () => this.king.transfer(accounts[i + 1], '660'+e18, { from: accounts[0] }),
        ),
        Promise.resolve(),
    );
    (new Array(6).fill(0)).reduce(
        (promises, _, i) => promises.then(
            () => this.king.approve(this.raffle.address, '660'+e18, { from: accounts[i + 1] }),
        ),
        Promise.resolve(),
    );

    this.buyTx1 = await this.raffle.buyTicket(accounts[8], { from: accounts[8]} ) // w/o the referrer
    this.buyTx2 = await this.raffle.buyTicket(accounts[1], { from: accounts[8]} ) // with accounts[1] as the referrer

    this.lastBuyTx = await (new Array(198).fill(0)).reduce(
        // buy 198 tickets from accounts[1..6], 33 txs from each account, indicating accounts[2..7] as referrers
        (promises, _, i) => promises.then(
            () => this.raffle.buyTicket(accounts[(i % 6) + 2], { from: accounts[(i % 6) + 1]} ),
        )
        , Promise.resolve(),
    );

    // close the game
    this.drawTx = await this.raffle.draw();
  });

  context('For a pre-defined scenario (game)', () => {
    it('should change $KING balances of participants as expected', async () => {
      // only the referrer reward for buyTx2 remains
      assert.equal((await this.king.balanceOf(accounts[1])).toString(), '1' + e18);

      // referrer rewards from 33 buys
      assert.equal((await this.king.balanceOf(accounts[2])).toString(), '33' + e18);
      assert.equal((await this.king.balanceOf(accounts[3])).toString(), '33' + e18);
      assert.equal((await this.king.balanceOf(accounts[4])).toString(), '33' + e18);
      assert.equal((await this.king.balanceOf(accounts[5])).toString(), '33' + e18);
      assert.equal((await this.king.balanceOf(accounts[6])).toString(), '33' + e18);
      assert.equal((await this.king.balanceOf(accounts[7])).toString(), '33' + e18);

      // nothing remains: entire balance was spent for 2 buys
      assert.equal((await this.king.balanceOf(accounts[8])).toString(), '0');
    });

    it('should register a referrer and a referree', async () => {
      assert.equal(this.lastBuyTx.logs[0].args.referrer, accounts[ (197 % 6) +2 ]);
      assert.equal(this.lastBuyTx.logs[0].args.referree, accounts[ (197 % 6) +1 ]);
    });

    it('should transfer expected proceeds to the pool address', async () => {
      // 20e18 for buyTx1 (no referrer reward), and 19e18 (less referrer reword) for 199 buys
      assert.equal((await this.king.balanceOf(pool)).toString(), '3801'+e18);
    });

    it('should select a winner', async () => {
      const winnerIndex = this.drawTx.logs[0].args.index.toString();
      const winnerAddress = this.drawTx.logs[0].args.participant;
      const wonGame = this.drawTx.logs[0].args.game.toString();

      assert.equal(web3.utils.isAddress(winnerAddress), true);
      assert.equal(await this.raffle.winningAddress(), winnerAddress);
      assert.equal(await this.raffle.participants(wonGame, winnerIndex), winnerAddress);
    });

    it('should finalize the game and switch to a new one', async () => {
      assert.equal((await this.raffle.participantsNum()).toString(), '0');
      assert.equal(this.drawTx.logs[1].event, 'Game');
      assert.equal(this.drawTx.logs[1].args.game.toString(), '2');
      assert.equal(this.lastBuyTx.logs[2].event, 'GameOver');
    });
  });
});
