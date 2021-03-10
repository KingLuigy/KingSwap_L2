/* global before, beforeEach, contract, it, web3 */
const { expectRevert, time: { latest } } = require('@openzeppelin/test-helpers');
const { ecsign } = require('ethereumjs-util');

const { createSnapshot, revertToSnapshot } = require('./helpers/blockchain');
const { getDomainSeparator } = require('./helpers/signUtils');

const MockERC677Token = artifacts.require('MockERC677Token');
const RoundTable = artifacts.require('RoundTable');

const { keccak256 } = web3.utils
const { abi } = web3.eth;

contract('RoundTable', ([ , alice, bob, carol, relayer]) => {
    const contractName = 'RoundTable'
    const chainId = 1; // Solidity' `assembly { chainId := chainid() }` returns '1' under ganache (which is buggy).
    let domainSeparator

    let table
    let king
    before(async () => {
        king = await MockERC677Token.new(0);
        table = await RoundTable.new(king.address);
        domainSeparator = getDomainSeparator(contractName, table.address, chainId)
        await king._mockMint(alice, '100');
        await king._mockMint(bob, '100');
        await king._mockMint(carol, '100');
    });

    let snapshotId
    beforeEach(async () => {
        snapshotId = await createSnapshot();
    })
    afterEach(async () => {
        await revertToSnapshot(snapshotId)
    })

    it('should not allow enter if not enough approve', async () => {
        await expectRevert.unspecified(table.enter('100', { from: alice }));
        await king.approve(table.address, '50', { from: alice });
        await expectRevert.unspecified(table.enter('100', { from: alice }));
        await king.approve(table.address, '100', { from: alice });
        await table.enter('100', { from: alice });
        assert.equal((await table.balanceOf(alice)).valueOf(), '100');
    });

    it('should not allow withraw more than what you have', async () => {
        await king.approve(table.address, '100', { from: alice });
        table.enter('100', { from: alice });
        await expectRevert.unspecified(table.leave('200', { from: alice }));
    });

    it('should work with more than one participant', async () => {
        await king.approve(table.address, '100', { from: alice });
        await king.approve(table.address, '100', { from: bob });
        // Alice enters and gets 20 shares. Bob enters and gets 10 shares.
        await table.enter('20', { from: alice });
        await table.enter('10', { from: bob });
        assert.equal((await table.balanceOf(alice)).valueOf(), '20');
        assert.equal((await table.balanceOf(bob)).valueOf(), '10');
        assert.equal((await king.balanceOf(table.address)).valueOf(), '30');
        // RoundTable get 20 more $KINGs from an external source.
        await king.transfer(table.address, '20', { from: carol });
        // Alice deposits 10 more $KINGs. She should receive 10*30/50 = 6 shares.
        await table.enter('10', { from: alice });
        assert.equal((await table.balanceOf(alice)).valueOf(), '26');
        assert.equal((await table.balanceOf(bob)).valueOf(), '10');
        // Bob withdraws 5 shares. He should receive 5*60/36 = 8 shares
        await table.leave('5', { from: bob });
        assert.equal((await table.balanceOf(alice)).valueOf(), '26');
        assert.equal((await table.balanceOf(bob)).valueOf(), '5');
        assert.equal((await king.balanceOf(table.address)).valueOf(), '52');
        assert.equal((await king.balanceOf(alice)).valueOf(), '70');
        assert.equal((await king.balanceOf(bob)).valueOf(), '98');
    });

    context('Meta-transactions', () => {
        const carolPrivKey = '6b9e71ba9d19287ccc998fdbb43ad4ab0c213a6acfe16b358bf7555bf8080380'

        before(async() => {
            assert.equal((await table.balanceOf(carol)).toString(), '0');
            const carolPrivKey = '6b9e71ba9d19287ccc998fdbb43ad4ab0c213a6acfe16b358bf7555bf8080380'
            expect(carol.toLowerCase(), 'private key does not match')
                .to.be.eq(web3.eth.accounts.privateKeyToAccount(carolPrivKey).address.toLowerCase())

            await king.approve(table.address, '11', { from: carol });
        });

        it('DOMAIN_SEPARATOR', async () => {
            expect(await table.DOMAIN_SEPARATOR()).to.be.eq(domainSeparator);
        });

        it('enterBySig', async () => {
            const ENTER_TYPEHASH = keccak256('Enter(address user,uint256 amount,uint256 nonce,uint256 deadline)');
            const nonce = (await table.nonces(carol)).toString();
            const deadline = `${100 + (await latest())}`;

            const message = '0x' + [
                '0x1901',
                domainSeparator,
                keccak256(
                    abi.encodeParameters(
                        ['bytes32', 'address', 'uint256', 'uint256','uint256'],
                        [ENTER_TYPEHASH, carol, '11', nonce, deadline]
                    )
                )
            ].map( s => s.replace('0x', '')).join('');
            const digest = keccak256(message);

            const { v, r, s } = ecsign(
                Buffer.from(digest.replace('0x', ''), 'hex'),
                Buffer.from(carolPrivKey.replace('0x', ''), 'hex')
            );

            await table.enterBySig(carol, '11', deadline, v, r, s, { from: relayer });

            assert.equal((await table.balanceOf(carol)).toString(), '11');
        });

        it('LeaveBySig', async () => {
            await table.enter('11', { from: carol });
            assert.equal((await table.balanceOf(carol)).toString(), '11');

            const LEAVE_TYPEHASH = keccak256('Leave(address user,uint256 share,uint256 nonce,uint256 deadline)');
            const nonce = (await table.nonces(carol)).toString();
            const deadline = `${100 + (await latest())}`;

            const message = '0x' + [
                '0x1901',
                domainSeparator,
                keccak256(
                    abi.encodeParameters(
                        ['bytes32', 'address', 'uint256', 'uint256','uint256'],
                        [LEAVE_TYPEHASH, carol, '11', nonce, deadline]
                    )
                )
            ].map( s => s.replace('0x', '')).join('');
            const digest = keccak256(message);

            const { v, r, s } = ecsign(
                Buffer.from(digest.replace('0x', ''), 'hex'),
                Buffer.from(carolPrivKey.replace('0x', ''), 'hex')
            );

            await table.leaveBySig(carol, '11', deadline, v, r, s, { from: relayer });
            assert.equal((await table.balanceOf(carol)).toString(), '0');
        });
    });
});
