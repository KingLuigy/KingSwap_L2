/* global artifacts, contract, beforeEach, it, web3 */
const {
  constants: { ZERO_ADDRESS }, expectEvent, expectRevert
} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const { createSnapshot, revertToSnapshot } = require('./helpers/blockchain');

const KingSwapFactory = artifacts.require('KingSwapFactory');
const KingSwapPair = artifacts.require('KingSwapPair');

const { sha3, toChecksumAddress } = web3.utils

const TEST_ADDRESSES = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000'
]

contract('KingSwapFactory', ([ owner,, wallet, other ]) => {
  let factory;

  before(async () => {
    factory = await KingSwapFactory.new(owner)
  })

  let snapshotId
  beforeEach(async () => {
    snapshotId = await createSnapshot();
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  it('feeTo, feeToSetter, allPairsLength', async () => {
    expect(await factory.feeTo()).to.eq(ZERO_ADDRESS)
    expect(await factory.feeToSetter()).to.eq(owner)
    expect((await factory.allPairsLength()).toString()).to.be.eq('0')
  })

  async function createPair(tokens) {
    const bytecode = KingSwapPair.bytecode
    const create2Address = buildCreate2Address(factory.address, getSalt(tokens), bytecode)
    const rc = await factory.createPair(...tokens)
    expectEvent(rc, 'PairCreated', { token0: TEST_ADDRESSES[0], token1: TEST_ADDRESSES[1], pair: create2Address })

    await expectRevert(factory.createPair(...tokens), 'KingSwap: PAIR_EXISTS')
    await expectRevert(factory.createPair(...tokens.slice().reverse()), 'KingSwap: PAIR_EXISTS')
    expect(await factory.getPair(...tokens)).to.eq(create2Address)
    expect(await factory.getPair(...tokens.slice().reverse())).to.eq(create2Address)
    expect(await factory.allPairs(0)).to.eq(create2Address)
    expect((await factory.allPairsLength()).toString()).to.be.eq('1')

    const pair = await KingSwapPair.at(create2Address)
    expect(await pair.factory()).to.eq(factory.address)
    expect(await pair.token0()).to.eq(TEST_ADDRESSES[0])
    expect(await pair.token1()).to.eq(TEST_ADDRESSES[1])
  }

  it('createPair', async () => {
    await createPair(TEST_ADDRESSES)
  })

  it('createPair:reverse', async () => {
    await createPair(TEST_ADDRESSES.slice().reverse())
  })

  it('createPair:gas', async () => {
    const rc = await factory.createPair(...TEST_ADDRESSES)
    expect(rc.receipt.gasUsed).to.eq(4061567)
  })

  it('setFeeTo', async () => {
    await expectRevert(factory.setFeeTo(other, { from: other }), 'KingSwap: FORBIDDEN')
    await factory.setFeeTo(wallet)
    expect(await factory.feeTo()).to.eq(wallet)
  })

  it('setFeeToSetter', async () => {
    await expectRevert(factory.setFeeToSetter(other, { from: other }), 'KingSwap: FORBIDDEN')
    await factory.setFeeToSetter(other)
    expect(await factory.feeToSetter()).to.eq(other)
    await expectRevert(factory.setFeeToSetter(wallet), 'KingSwap: FORBIDDEN')
  })
})

function buildCreate2Address(deployingAddr, salt, bytecode) {
  // keccak256(0xff ++ deployingAddr ++ salt ++ keccak256(bytecode))
  const prefix = '0xff' + deployingAddr.replace(/^0x/, '');
  const bytecodeHash = sha3(`${bytecode.startsWith('0x') ? '' : '0x'}${bytecode}`).replace(/^0x/, '');
  return toChecksumAddress(
      '0x' + sha3(`${prefix}${salt.replace(/^0x/, '')}${bytecodeHash}`.toLowerCase()).slice(-40),
  );
}

function getSalt([tokenA, tokenB]) {
  const [token0, token1] = (tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA])
      .map(s => s.replace('0x', '').toLowerCase())
  return sha3('0x' + token0 + token1)
}
