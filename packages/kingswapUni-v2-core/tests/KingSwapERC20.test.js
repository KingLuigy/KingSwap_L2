/* global web3 */
const { constants: { MAX_UINT256 }, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ecsign } = require('ethereumjs-util');
const { createSnapshot, revertToSnapshot } = require('./helpers/blockchain');

const KingSwapERC20 = artifacts.require('MockKingSwapERC20');

const { toBN, toHex, keccak256 } = web3.utils
const { abi } = web3.eth;

const TOTAL_SUPPLY = toBN(`10000`).mul(toBN(`${1e18}`))
const TEST_AMOUNT = toBN(`${10e18}`)
const PERMIT_TYPEHASH = keccak256(
    'Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'
)

contract('KingSwapERC20', ([wallet, other, relayer]) => {
  const contractName = 'KingSwap LP Token'
  let chainId
  let token
  let domainSeparator

  before(async () => {
    // Solidity' `assembly { chainId := chainid() }` returns '1' under ganache (which is buggy).
    // Therefore `chainId = await web3.eth.getChainId()` does not work in this test
    chainId = 1;
    token = await KingSwapERC20.new()
    domainSeparator = getDomainSeparator(contractName, token.address, chainId)
    await token._mockMint(wallet, TOTAL_SUPPLY)
  })

  let snapshotId
  beforeEach(async () => {
    snapshotId = await createSnapshot();
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  it('name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH', async () => {
    expect(await token.name()).to.eq(contractName)
    expect(await token.symbol()).to.eq('KLP')
    expect((await token.decimals()).toString()).to.be.eq('18')
    expect(await token.totalSupply()).to.be.bignumber.equal(TOTAL_SUPPLY)
    expect(await token.balanceOf(wallet)).to.be.bignumber.equal(TOTAL_SUPPLY)
    expect(await token.DOMAIN_SEPARATOR()).to.eq(domainSeparator)
    expect(await token.PERMIT_TYPEHASH()).to.eq(PERMIT_TYPEHASH)
  })

  it('approve', async () => {
    let rc = await token.approve(other, TEST_AMOUNT)
    expectEvent(rc, 'Approval', { owner: wallet, spender: other, value: TEST_AMOUNT })
    expect(await token.allowance(wallet, other)).to.be.bignumber.equal(TEST_AMOUNT)
  })

  it('transfer', async () => {
    let rc = await token.transfer(other, TEST_AMOUNT)
    expectEvent(rc, 'Transfer', { from: wallet, to: other, value: TEST_AMOUNT })
    expect(await token.balanceOf(wallet)).to.be.bignumber.equal(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other)).to.be.bignumber.equal(TEST_AMOUNT)
  })

  it('transfer:fail', async () => {
    await expectRevert(token.transfer(other, TOTAL_SUPPLY.addn(1)), 'ds-math-sub-underflow')
    await expectRevert(token.transfer(wallet, 1, { from: other }), 'ds-math-sub-underflow')
  })

  it('transferFrom', async () => {
    await token.approve(other, TEST_AMOUNT)
    let rc = await token.transferFrom(wallet, other, TEST_AMOUNT, { from: other })
    expectEvent(rc, 'Transfer', { from: wallet, to: other, value: TEST_AMOUNT })
    expect(await token.allowance(wallet, other)).to.be.bignumber.equal('0')
    expect(await token.balanceOf(wallet)).to.be.bignumber.equal(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other)).to.be.bignumber.equal(TEST_AMOUNT)
  })

  it('transferFrom:max', async () => {
    await token.approve(other, MAX_UINT256)
    let rc = await token.transferFrom(wallet, other, TEST_AMOUNT, { from: other })
    expectEvent(rc, 'Transfer', { from: wallet, to: other, value: TEST_AMOUNT })
    expect(await token.allowance(wallet, other)).to.be.bignumber.equal(MAX_UINT256)
    expect(await token.balanceOf(wallet)).to.be.bignumber.equal(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other)).to.be.bignumber.equal(TEST_AMOUNT)
  })

  it('permit', async () => {
    const knownAccount = '0x7BAe1c04e5Cef0E5d635ccC0D782A21aCB920BeB'
    const knownPrivKey = '0x91321eae1fdacd444c2fe4913f9f067de6accfbd1ebb6188551b508173635d56'
    expect(
        wallet.toLowerCase(),
        'pre-set account (with known private key) expected'
    ).to.be.eq(knownAccount.toLowerCase())

    const nonce = await token.nonces(wallet)
    const message = '0x' + [
      '0x1901',
      domainSeparator,
      keccak256(
          abi.encodeParameters(
              ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
              [PERMIT_TYPEHASH, wallet, other, TEST_AMOUNT, nonce, MAX_UINT256]
          )
      )
    ].map( s => s.replace('0x', '')).join('')
    const digest = keccak256(message)

    const { v, r, s } = ecsign(
        Buffer.from(digest.replace('0x', ''), 'hex'),
        Buffer.from(knownPrivKey.replace('0x', ''), 'hex')
    )

    const rc = await token.permit(wallet, other, TEST_AMOUNT, MAX_UINT256, v, toHex(r), toHex(s), { from: relayer })

    expectEvent(rc, 'Approval', { owner: wallet, spender: other, value: TEST_AMOUNT })
    expect(await token.allowance(wallet, other)).to.be.bignumber.equal(TEST_AMOUNT)
    expect(await token.nonces(wallet)).to.be.bignumber.equal(toBN('1'))
  })
})

function getDomainSeparator(name, contractAddress, chainId, version = `1`) {
  return web3.utils.keccak256(
      web3.eth.abi.encodeParameters(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            web3.utils.keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
            web3.utils.keccak256(name),
            web3.utils.keccak256(version),
            chainId,
            contractAddress
          ]
      )
  )
}
