/* global artifacts, contract, beforeEach, it, web3 */
const { constants: { ZERO_ADDRESS }, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { createSnapshot, revertToSnapshot } = require('./helpers/blockchain');

const KingSwapRouter = artifacts.require('KingSwapRouter')
const WETH9 = artifacts.require('WETH9')
const MockERC20 = artifacts.require('MockERC20')
const { abi: fAbi, bytecode: fBytecode } = require('../resources/kingswapUni-v2-core/KingSwapFactory.json')
const { abi: pairAbi } = require('../resources/kingswapUni-v2-core/KingSwapPair.json')

const { toBN } = web3.utils
const e18 = '000000000000000000'
const expandTo18Decimals = n => toBN(`${n}${e18}`)

contract('KingSwapRouter', ([ owner, feeToSetter, other, nobody ]) => {
  let router
  let factory
  let weth
  let tokenA
  let tokenB

  before(async () => {
    weth = await WETH9.new()
    tokenA =  await MockERC20.new(expandTo18Decimals(10000), { from: owner })
    tokenB =  await MockERC20.new(expandTo18Decimals(10000), { from: owner })
    factory = await (new web3.eth.Contract(fAbi, {data: fBytecode})).deploy({arguments: [feeToSetter]}).send({ from: nobody, gas: 5000000 })
    router = await KingSwapRouter.new(factory.options.address, weth.address)
    expect((await router.factory()).toLowerCase()).to.be.eq(factory.options.address.toLowerCase())
    await tokenA.approve(router.address, `${2e18}`)
    await tokenB.approve(router.address, `${2e18}`)
  })

  let snapshotId
  beforeEach(async () => {
    snapshotId = await createSnapshot();
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  describe('addLiquidity', () => {
    it('creates KingSwapPair', async () => {
      await expectRevert(router.addLiquidity(
          tokenA.address, ZERO_ADDRESS, `${2e18}`, `${1e18}`, `${18e17}`, `${8e17}`, other, '0xffffffffffffff'
      ), 'KingSwap: ZERO_ADDRESS')

      await router.addLiquidity(
          tokenA.address, tokenB.address, `${2e18}`, `${1e18}`, `${18e17}`, `${8e17}`, other, '0xffffffffffffff'
      )
      const pairAddr = await factory.methods.getPair(tokenA.address, tokenB.address).call()
      const pair = new web3.eth.Contract(pairAbi, pairAddr)

      expect(await pair.methods.symbol().call()).to.be.eq('KLP')
      expect(await tokenA.balanceOf(pairAddr)).to.be.bignumber.eq(`${2e18}`)
      expect(await tokenB.balanceOf(pairAddr)).to.be.bignumber.eq(`${1e18}`)
    })
  })
})
