/* global web3 */
const {
  constants: { ZERO_ADDRESS }, expectEvent, expectRevert, time: { advanceBlock, increaseTo }
} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const { createSnapshot, revertToSnapshot } = require('./helpers/blockchain');

const KingSwapFactory = artifacts.require('KingSwapFactory');
const KingSwapPair = artifacts.require('KingSwapPair');
const MockERC20 = artifacts.require('MockERC20');

const { toBN } = web3.utils
const e18 = '000000000000000000'
const expandTo18Decimals = n => toBN(`${n}${e18}`)

const MINIMUM_LIQUIDITY = toBN('1000')

contract('KingSwapPair', ([ owner,, wallet, other ]) => {
  let factory
  let token0
  let token1
  let pair

  const getMoreGas = (opts = {}) => Object.assign({
    from: wallet,
    gasLimit: 9999999
  }, opts)

  before(async () => {
    factory = await KingSwapFactory.new(owner)
    const tokenA =  await MockERC20.new(expandTo18Decimals(10000), { from: owner })
    const tokenB =  await MockERC20.new(expandTo18Decimals(10000), { from: owner })
    await factory.createPair(tokenA.address, tokenB.address)
    const pairAddr =  await factory.getPair(tokenA.address, tokenB.address)
    pair = await KingSwapPair.at(pairAddr)
    const token0Addr = await pair.token0();
    if (token0Addr.toLowerCase() === tokenA.address.toLowerCase()) {
      token0 = tokenA
      token1 = tokenB
    } else {
      token0 = tokenB
      token1 = tokenA
    }
  })

  let snapshotId
  beforeEach(async () => {
    snapshotId = await createSnapshot();
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  it('mint', async () => {
    const token0Amount = expandTo18Decimals(1)
    const token1Amount = expandTo18Decimals(4)
    await token0.transfer(pair.address, token0Amount)
    await token1.transfer(pair.address, token1Amount)

    const expectedLiquidity = expandTo18Decimals(2)
    const rc = await pair.mint(wallet, getMoreGas())
    expectEvent(rc, 'Transfer', { from: ZERO_ADDRESS, to: ZERO_ADDRESS, value: MINIMUM_LIQUIDITY})
    expectEvent(rc, 'Transfer', { from: ZERO_ADDRESS, to: wallet, value: expectedLiquidity.sub(MINIMUM_LIQUIDITY) })
    expectEvent(rc, 'Sync', { reserve0: token0Amount, reserve1: token1Amount })
    expectEvent(rc, 'Mint', { sender: wallet, amount0: token0Amount, amount1: token1Amount })

    expect(await pair.totalSupply()).to.be.bignumber.equal(expectedLiquidity)
    expect(await pair.balanceOf(wallet)).to.be.bignumber.equal(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    expect(await token0.balanceOf(pair.address)).to.be.bignumber.equal(token0Amount)
    expect(await token1.balanceOf(pair.address)).to.be.bignumber.equal(token1Amount)
    const reserves = await pair.getReserves()
    expect(reserves[0]).to.be.bignumber.equal(token0Amount)
    expect(reserves[1]).to.be.bignumber.equal(token1Amount)
  })

  async function addLiquidity(token0Amount, token1Amount) {
    await token0.transfer(pair.address, token0Amount)
    await token1.transfer(pair.address, token1Amount)
    await pair.mint(wallet, getMoreGas())
  }

  const swapTestCases = [
    // [ in0, r0, r1, out1 ], where out1 = r1 - (r0 * r1 / (r0 + i0 * 9975/10000))
    [1, 5, 10, '1663192997082117549'],
    [1, 10, 5, '453512161854967038'],

    [2, 5, 10, '2852037169406719086'],
    [2, 10, 5, '831596498541058775'],

    [1, 10, 10, '907024323709934076'],
    [1, 100, 100, '987648209114086983'],
    [1, 1000, 1000, '996505985279683516']
  ].map(a => a.map(n => typeof n === 'string' ? toBN(n) : expandTo18Decimals(n)))

  swapTestCases.forEach((swapTestCase, i) => {
    it(`getInputPrice:${i}`, async () => {
      const [swapAmount, token0Amount, token1Amount, expectedOutputAmount] = swapTestCase
      await addLiquidity(token0Amount, token1Amount)
      await token0.transfer(pair.address, swapAmount)
      await expectRevert(pair.swap(0, expectedOutputAmount.addn(1), wallet, '0x', getMoreGas()), 'KingSwap: K')
      await pair.swap(0, expectedOutputAmount.subn(1), wallet, '0x', getMoreGas())
    })
  })

  const optimisticTestCases = [
    ['997500000000000000', 5, 10, 1], // given amountIn, amountOut = floor(amountIn * .9975)
    ['997500000000000000', 10, 5, 1],
    ['997500000000000000', 5, 5, 1],
    [1, 5, 5, '1002506265664160401'] // given amountOut, amountIn = ceiling(amountOut / .9975)
  ].map(a => a.map(n => (typeof n === 'string' ? toBN(n) : expandTo18Decimals(n))))
  optimisticTestCases.forEach((optimisticTestCase, i) => {
    it(`optimistic:${i}`, async () => {
      const [outputAmount, token0Amount, token1Amount, inputAmount] = optimisticTestCase
      await addLiquidity(token0Amount, token1Amount)
      await token0.transfer(pair.address, inputAmount)
      await expectRevert(pair.swap(outputAmount.addn(1), 0, wallet, '0x', getMoreGas()), 'KingSwap: K')
      await pair.swap(outputAmount.subn(1), 0, wallet, '0x', getMoreGas())
    })
  })

  it('swap:token0', async () => {
    const token0Amount = expandTo18Decimals(5)
    const token1Amount = expandTo18Decimals(10)
    await addLiquidity(token0Amount, token1Amount)

    const swapAmount = expandTo18Decimals(1)
    const expectedOutputAmount = toBN('1663192997082117548')
    await token0.transfer(pair.address, swapAmount)
    const rc = await pair.swap('0', expectedOutputAmount, wallet, [], getMoreGas())
    expectEvent(rc, 'Transfer', { from: pair.address, to: wallet, value: expectedOutputAmount })
    expectEvent(rc, 'Sync', { reserve0: token0Amount.add(swapAmount), reserve1: token1Amount.sub(expectedOutputAmount) })
    expectEvent(rc, 'Swap', { sender: wallet, amount0In: swapAmount, amount1In: '0', amount0Out: '0', amount1Out: expectedOutputAmount, to: wallet })

    const reserves = await pair.getReserves()
    expect(reserves[0]).to.be.bignumber.equal(token0Amount.add(swapAmount))
    expect(reserves[1]).to.be.bignumber.equal(token1Amount.sub(expectedOutputAmount))
    expect(await token0.balanceOf(pair.address)).to.be.bignumber.equal(token0Amount.add(swapAmount))
    expect(await token1.balanceOf(pair.address)).to.be.bignumber.equal(token1Amount.sub(expectedOutputAmount))
    const totalSupplyToken0 = await token0.totalSupply()
    expect(await token0.balanceOf(owner)).to.be.bignumber.equal(totalSupplyToken0.sub(token0Amount).sub(swapAmount))
    expect(await token1.balanceOf(wallet)).to.be.bignumber.equal(expectedOutputAmount)
  })

  it('swap:token1', async () => {
    const token0Amount = expandTo18Decimals(5)
    const token1Amount = expandTo18Decimals(10)
    await addLiquidity(token0Amount, token1Amount)

    const swapAmount = expandTo18Decimals(1)
    const expectedOutputAmount = toBN('453512161854967037')
    await token1.transfer(pair.address, swapAmount)
    const rc = await pair.swap(expectedOutputAmount, '0', wallet, '0x', getMoreGas())
    expectEvent(rc, 'Transfer', { from: pair.address, to: wallet, value: expectedOutputAmount})
    expectEvent(rc, 'Sync', { reserve0: token0Amount.sub(expectedOutputAmount), reserve1: token1Amount.add(swapAmount) })
    expectEvent(rc, 'Swap', { sender: wallet, amount0In: '0', amount1In: swapAmount, amount0Out: expectedOutputAmount, amount1Out: '0', to: wallet })

    const reserves = await pair.getReserves()
    expect(reserves[0]).to.be.bignumber.equal(token0Amount.sub(expectedOutputAmount))
    expect(reserves[1]).to.be.bignumber.equal(token1Amount.add(swapAmount))
    expect(await token0.balanceOf(pair.address)).to.be.bignumber.equal(token0Amount.sub(expectedOutputAmount))
    expect(await token1.balanceOf(pair.address)).to.be.bignumber.equal(token1Amount.add(swapAmount))
    const totalSupplyToken1 = await token1.totalSupply()
    expect(await token0.balanceOf(wallet)).to.be.bignumber.equal(expectedOutputAmount)
    expect(await token1.balanceOf(owner)).to.be.bignumber.equal(totalSupplyToken1.sub(token1Amount).sub(swapAmount))
  })

  it('swap:gas', async () => {
    const token0Amount = expandTo18Decimals(5)
    const token1Amount = expandTo18Decimals(10)
    await addLiquidity(token0Amount, token1Amount)

    // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
    await advanceBlock()
    await pair.sync(getMoreGas())

    const swapAmount = expandTo18Decimals(1)
    const expectedOutputAmount = toBN('453512161854967037')
    await token1.transfer(pair.address, swapAmount)
    await advanceBlock()
    const rc = await pair.swap(expectedOutputAmount, 0, wallet, '0x', getMoreGas())
    const gasUsed = parseInt(rc.receipt.gasUsed)
    expect(gasUsed > 100000 && gasUsed < 150000).to.be.eq(true)
  })

  it('burn', async () => {
    const token0Amount = expandTo18Decimals(3)
    const token1Amount = expandTo18Decimals(3)
    await addLiquidity(token0Amount, token1Amount)

    const expectedLiquidity = expandTo18Decimals(3)
    await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY), { from: wallet })
    const rc = await pair.burn(wallet, getMoreGas())
    expectEvent(rc, 'Transfer', { from: pair.address, to: ZERO_ADDRESS, value: expectedLiquidity.sub(MINIMUM_LIQUIDITY) })
    expectEvent(rc, 'Transfer', { from: pair.address, to: wallet, value: token0Amount.subn(1000) })
    expectEvent(rc, 'Transfer', { from: pair.address, to: wallet, value: token1Amount.subn(1000) })
    expectEvent(rc, 'Sync', { reserve0: '1000', reserve1: '1000' })
    expectEvent(rc, 'Burn', { sender: wallet, amount0: token0Amount.subn(1000), amount1: token1Amount.subn(1000), to: wallet })

    expect(await pair.balanceOf(wallet)).be.bignumber.equal(toBN(0))
    expect(await pair.totalSupply()).to.be.bignumber.equal(MINIMUM_LIQUIDITY)
    expect(await token0.balanceOf(pair.address)).to.be.bignumber.equal(toBN('1000'))
    expect(await token1.balanceOf(pair.address)).to.be.bignumber.equal(toBN('1000'))
    const totalSupplyToken0 = await token0.totalSupply()
    const totalSupplyToken1 = await token1.totalSupply()
    expect((await token0.balanceOf(owner)).add(await token0.balanceOf(wallet))).to.be.bignumber.equal(totalSupplyToken0.subn(1000))
    expect((await token1.balanceOf(owner)).add(await token1.balanceOf(wallet))).to.be.bignumber.equal(totalSupplyToken1.subn(1000))
  })

  // FIXME: fix the test
  xit('price{0,1}CumulativeLast', async () => {
    const token0Amount = expandTo18Decimals(3)
    const token1Amount = expandTo18Decimals(3)
    await addLiquidity(token0Amount, token1Amount)

    const blockTimestamp = (await pair.getReserves())[2]
    await increaseTo(blockTimestamp + 1)
    await pair.sync(getMoreGas())

    const initialPrice = encodePrice(token0Amount, token1Amount)
    expect(await pair.price0CumulativeLast()).to.be.bignumber.equal(initialPrice[0])
    expect(await pair.price1CumulativeLast()).to.be.bignumber.equal(initialPrice[1])
    expect((await pair.getReserves())[2]).to.be.bignumber.equal(blockTimestamp + 1)

    const swapAmount = expandTo18Decimals(3)
    await token0.transfer(pair.address, swapAmount)
    await increaseTo(blockTimestamp + 10)
    // swap to a new price eagerly instead of syncing
    await pair.swap(0, expandTo18Decimals(1), wallet, '0x', getMoreGas()) // make the price nice

    expect(await pair.price0CumulativeLast()).to.be.bignumber.equal(initialPrice[0].mul(10))
    expect(await pair.price1CumulativeLast()).to.be.bignumber.equal(initialPrice[1].mul(10))
    expect((await pair.getReserves())[2]).to.be.bignumber.equal(blockTimestamp + 10)

    await increaseTo(blockTimestamp + 20)
    await pair.sync(getMoreGas())

    const newPrice = encodePrice(expandTo18Decimals(6), expandTo18Decimals(2))
    expect(await pair.price0CumulativeLast()).to.be.bignumber.equal(initialPrice[0].mul(10).add(newPrice[0].mul(10)))
    expect(await pair.price1CumulativeLast()).to.be.bignumber.equal(initialPrice[1].mul(10).add(newPrice[1].mul(10)))
    expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 20)
  })

  it('feeTo:off', async () => {
    const token0Amount = expandTo18Decimals(1000)
    const token1Amount = expandTo18Decimals(1000)
    await addLiquidity(token0Amount, token1Amount)

    const swapAmount = expandTo18Decimals(1)
    const expectedOutputAmount = toBN('996505985279683515')
    await token1.transfer(pair.address, swapAmount)
    await pair.swap(expectedOutputAmount, 0, wallet, '0x', getMoreGas())

    const expectedLiquidity = expandTo18Decimals(1000)
    await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY), { from: wallet })
    await pair.burn(wallet, getMoreGas())
    expect(await pair.totalSupply()).to.be.bignumber.equal(MINIMUM_LIQUIDITY)
  })

  it('feeTo:on', async () => {
    await factory.setFeeTo(other)

    const token0Amount = expandTo18Decimals(1000)
    const token1Amount = expandTo18Decimals(1000)
    await addLiquidity(token0Amount, token1Amount)

    const swapAmount = expandTo18Decimals(1)
    const expectedOutputAmount = toBN('996505985279683515')
    await token1.transfer(pair.address, swapAmount)
    await pair.swap(expectedOutputAmount, 0, wallet, '0x', getMoreGas())

    const expectedLiquidity = expandTo18Decimals(1000)
    await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY), { from: wallet })
    await pair.burn(wallet, getMoreGas())
    // TODO: check the number 249750468063693
    expect(await pair.totalSupply()).to.be.bignumber.equal(MINIMUM_LIQUIDITY.add(toBN('249750468063693')))
    expect(await pair.balanceOf(other)).to.be.bignumber.equal(toBN('249750468063693'))

    // using 1000 here instead of the symbolic MINIMUM_LIQUIDITY because the amounts only happen to be equal...
    // ...because the initial liquidity amounts were equal
    expect(await token0.balanceOf(pair.address)).to.be.bignumber.equal(toBN('1000').add(toBN('249501527914317')))
    expect(await token1.balanceOf(pair.address)).to.be.bignumber.equal(toBN('1000').add(toBN('250000156094102')))
  })
})

function encodePrice(reserve0, reserve1) {
  const c = toBN('2').pow(toBN('112'))
  return [ reserve1.mul(c).div(reserve0), reserve0.mul(c).div(reserve1) ]
}
