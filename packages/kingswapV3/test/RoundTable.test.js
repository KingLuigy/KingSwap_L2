const { expectRevert } = require('@openzeppelin/test-helpers');
const KingToken = artifacts.require('KingToken');
const RoundTable = artifacts.require('RoundTable');

contract('RoundTable', ([alice, bob, carol]) => {
    beforeEach(async () => {
        this.king = await KingToken.new({ from: alice });
        this.table = await RoundTable.new(this.king.address, { from: alice });
        this.king.mint(alice, '100', { from: alice });
        this.king.mint(bob, '100', { from: alice });
        this.king.mint(carol, '100', { from: alice });
    });

    it('should not allow enter if not enough approve', async () => {
        await expectRevert(
            this.table.enter('100', { from: alice }),
            'ERC20: transfer amount exceeds allowance',
        );
        await this.king.approve(this.table.address, '50', { from: alice });
        await expectRevert(
            this.table.enter('100', { from: alice }),
            'ERC20: transfer amount exceeds allowance',
        );
        await this.king.approve(this.table.address, '100', { from: alice });
        await this.table.enter('100', { from: alice });
        assert.equal((await this.table.balanceOf(alice)).valueOf(), '100');
    });

    it('should not allow withraw more than what you have', async () => {
        await this.king.approve(this.table.address, '100', { from: alice });
        await this.table.enter('100', { from: alice });
        await expectRevert(
            this.table.leave('200', { from: alice }),
            'ERC20: burn amount exceeds balance',
        );
    });

    it('should work with more than one participant', async () => {
        await this.king.approve(this.table.address, '100', { from: alice });
        await this.king.approve(this.table.address, '100', { from: bob });
        // Alice enters and gets 20 shares. Bob enters and gets 10 shares.
        await this.table.enter('20', { from: alice });
        await this.table.enter('10', { from: bob });
        assert.equal((await this.table.balanceOf(alice)).valueOf(), '20');
        assert.equal((await this.table.balanceOf(bob)).valueOf(), '10');
        assert.equal((await this.king.balanceOf(this.table.address)).valueOf(), '30');
        // RoundTable get 20 more $KINGs from an external source.
        await this.king.transfer(this.table.address, '20', { from: carol });
        // Alice deposits 10 more $KINGs. She should receive 10*30/50 = 6 shares.
        await this.table.enter('10', { from: alice });
        assert.equal((await this.table.balanceOf(alice)).valueOf(), '26');
        assert.equal((await this.table.balanceOf(bob)).valueOf(), '10');
        // Bob withdraws 5 shares. He should receive 5*60/36 = 8 shares
        await this.table.leave('5', { from: bob });
        assert.equal((await this.table.balanceOf(alice)).valueOf(), '26');
        assert.equal((await this.table.balanceOf(bob)).valueOf(), '5');
        assert.equal((await this.king.balanceOf(this.table.address)).valueOf(), '52');
        assert.equal((await this.king.balanceOf(alice)).valueOf(), '70');
        assert.equal((await this.king.balanceOf(bob)).valueOf(), '98');
    });
});
