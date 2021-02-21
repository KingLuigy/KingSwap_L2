const HomeAMBErc677ToErc677 = artifacts.require('HomeAMBErc677ToErc677.sol')
const Eip1967Proxy = artifacts.require('Eip1967ProxyMock.sol')
const ForeignAMBErc677ToErc677 = artifacts.require('ForeignAMBErc677ToErc677.sol')
const ERC677BridgeToken = artifacts.require('ERC677BridgeTokenMock.sol')
const AMBMock = artifacts.require('AMBMock.sol')
const HomeAMB = require('../resources/poanetwork/tokenbridge-contracts/HomeAMB.json')
const BridgeValidators = require('../resources/poanetwork/tokenbridge-contracts/BridgeValidators.json')

const { expect } = require('chai')
const { shouldBehaveLikeBasicAMBErc677ToErc677 } = require('./AMBErc677ToErc677Behavior.test')

const { getEvents, ether, expectEventInLogs } = require('./helpers/helpers')
const { ERROR_MSG, toBN } = require('./helpers/setup')

const ZERO = toBN(0)
const oneEther = ether('1')
const twoEthers = ether('2')
const maxGasPerTx = oneEther
const dailyLimit = twoEthers
const maxPerTx = oneEther
const minPerTx = ether('0.01')
const executionDailyLimit = dailyLimit
const executionMaxPerTx = maxPerTx
const exampleMessageId = '0xf308b922ab9f8a7128d9d7bc9bce22cd88b2c05c8213f0e2d8104d78e0a9ecbb'
const otherMessageId = '0x2ebc2ccc755acc8eaf9252e19573af708d644ab63a39619adb080a3500a4ff2e'
const decimalShiftZero = 0
const HOME_CHAIN_ID = 77
const HOME_CHAIN_ID_HEX = `0x${HOME_CHAIN_ID.toString(16).padStart(2, '0')}`
const FOREIGN_CHAIN_ID = 88
const FOREIGN_CHAIN_ID_HEX = `0x${FOREIGN_CHAIN_ID.toString(16).padStart(2, '0')}`

contract('HomeAMBErc677ToErc677', async accounts => {
  const owner = accounts[0]
  const user = accounts[1]
  let ambBridgeContract
  let mediatorContract
  let erc677Token
  let homeBridge
  beforeEach(async function() {
    const homeBridgeImpl = await HomeAMBErc677ToErc677.new()
    const homeBridgeProxy = await Eip1967Proxy.new(homeBridgeImpl.address).should.be.fulfilled
    this.proxyContract = await HomeAMBErc677ToErc677.at(homeBridgeProxy.address)
  })
  shouldBehaveLikeBasicAMBErc677ToErc677(ForeignAMBErc677ToErc677, accounts)
  describe('onTokenTransfer', () => {
    beforeEach(async () => {
      const validatorContract = await (
          new web3.eth.Contract(BridgeValidators.abi, {data: BridgeValidators.bytecode})
      ).deploy({arguments: []}).send({from: accounts[0], gas: 5000000})
      const authorities = [accounts[1], accounts[2]]
      await validatorContract.methods.initialize(1, authorities, owner).send({from: accounts[0], gas: 5000000})

      ambBridgeContract = await (
          new web3.eth.Contract(HomeAMB.abi, {data: HomeAMB.bytecode})
      ).deploy({arguments: []}).send({from: accounts[0], gas: 5000000})
      await ambBridgeContract.initialize(
        HOME_CHAIN_ID_HEX,
        FOREIGN_CHAIN_ID_HEX,
        validatorContract.options.address,
        maxGasPerTx,
        '1',
        '1',
        owner
      ).send({ from: accounts[0], gas: 5000000 })

      const foreignBridgeImpl = await ForeignAMBErc677ToErc677.new()
      const foreignBridgeProxy = await Eip1967Proxy.new(foreignBridgeImpl.address)
      mediatorContract =await ForeignAMBErc677ToErc677.at(foreignBridgeProxy.address)

      const homeBridgeImpl = await HomeAMBErc677ToErc677.new()
      const homeBridgeProxy = await Eip1967Proxy.new(homeBridgeImpl.address).should.be.fulfilled
      homeBridge = await HomeAMBErc677ToErc677.at(homeBridgeProxy.address)

      erc677Token = await ERC677BridgeToken.new('test', 'TST', 18)
      await erc677Token.setBridgeContract(homeBridge.address)
      await erc677Token._mockMint(user, twoEthers, { from: owner }).should.be.fulfilled
      await erc677Token.transferOwnership(homeBridge.address)

      await homeBridge.initialize(
        ambBridgeContract.options.address,
        mediatorContract.address,
        erc677Token.address,
        [dailyLimit, maxPerTx, minPerTx],
        [executionDailyLimit, executionMaxPerTx],
        maxGasPerTx,
        decimalShiftZero,
        owner
      ).should.be.fulfilled
    })
    it('should emit UserRequestForSignature in AMB bridge and burn transferred tokens', async () => {
      // Given
      const currentDay = await homeBridge.getCurrentDay()
      expect(await homeBridge.totalSpentPerDay(currentDay)).to.be.bignumber.equal(ZERO)
      // const initialEvents = await getEvents(ambBridgeContract, { event: 'UserRequestForSignature' })
      // expect(initialEvents.length).to.be.equal(0)
      expect(await erc677Token.totalSupply()).to.be.bignumber.equal(twoEthers)

      // only token address can call it
      await homeBridge.onTokenTransfer(user, oneEther, '0x', { from: owner }).should.be.rejectedWith(ERROR_MSG)

      // must be within limits
      await erc677Token
        .transferAndCall(homeBridge.address, twoEthers, '0x', { from: user })
        .should.be.rejectedWith(ERROR_MSG)

      // When
      const { logs } = await erc677Token.transferAndCall(homeBridge.address, oneEther, '0x', { from: user }).should.be
        .fulfilled

      // Then
      // const events = await getEvents(ambBridgeContract, { event: 'UserRequestForSignature' })
      // expect(events.length).to.be.equal(1)
      // expect(events[0].returnValues.encodedData.includes(strip0x(user).toLowerCase())).to.be.equal(true)
      expect(await homeBridge.totalSpentPerDay(currentDay)).to.be.bignumber.equal(oneEther)
      expect(await erc677Token.totalSupply()).to.be.bignumber.equal(oneEther)
      expectEventInLogs(logs, 'Burn', {
        burner: homeBridge.address,
        value: oneEther
      })
    })
    it('should be able to specify a different receiver', async () => {
      const user2 = accounts[2]
      // Given
      const currentDay = await homeBridge.getCurrentDay()
      expect(await homeBridge.totalSpentPerDay(currentDay)).to.be.bignumber.equal(ZERO)
      // const initialEvents = await getEvents(ambBridgeContract, { event: 'UserRequestForSignature' })
      // expect(initialEvents.length).to.be.equal(0)
      expect(await erc677Token.totalSupply()).to.be.bignumber.equal(twoEthers)

      // When
      await erc677Token
        .transferAndCall(homeBridge.address, oneEther, '0x00', { from: user })
        .should.be.rejectedWith(ERROR_MSG)
      const { logs } = await erc677Token.transferAndCall(homeBridge.address, oneEther, user2, { from: user }).should.be
        .fulfilled

      // Then
      // const events = await getEvents(ambBridgeContract, { event: 'UserRequestForSignature' })
      // expect(events.length).to.be.equal(1)
      // expect(events[0].returnValues.encodedData.includes(strip0x(user2).toLowerCase())).to.be.equal(true)
      expect(await homeBridge.totalSpentPerDay(currentDay)).to.be.bignumber.equal(oneEther)
      expect(await erc677Token.totalSupply()).to.be.bignumber.equal(oneEther)
      expectEventInLogs(logs, 'Burn', {
        burner: homeBridge.address,
        value: oneEther
      })
    })
  })
  describe('handleBridgedTokens', () => {
    beforeEach(async () => {
      ambBridgeContract = await AMBMock.new()
      await ambBridgeContract.setMaxGasPerTx(maxGasPerTx)

      const foreignBridgeImpl = await ForeignAMBErc677ToErc677.new()
      const foreignBridgeProxy = await Eip1967Proxy.new(foreignBridgeImpl.address).should.be.fulfilled
      mediatorContract = await ForeignAMBErc677ToErc677.at(foreignBridgeProxy.address)

      const homeBridgeImpl = await HomeAMBErc677ToErc677.new()
      const homeBridgeProxy = await Eip1967Proxy.new(homeBridgeImpl.address).should.be.fulfilled
      homeBridge = await HomeAMBErc677ToErc677.at(homeBridgeProxy.address)

      erc677Token = await ERC677BridgeToken.new('test', 'TST', 18)
      await erc677Token.setBridgeContract(homeBridge.address)
      await erc677Token.transferOwnership(homeBridge.address)

      await homeBridge.initialize(
        ambBridgeContract.address,
        mediatorContract.address,
        erc677Token.address,
        [dailyLimit, maxPerTx, minPerTx],
        [executionDailyLimit, executionMaxPerTx],
        maxGasPerTx,
        decimalShiftZero,
        owner
      ).should.be.fulfilled
    })
    it('should mint tokens on message from amb', async () => {
      // Given
      const currentDay = await homeBridge.getCurrentDay()
      expect(await homeBridge.totalExecutedPerDay(currentDay)).to.be.bignumber.equal(ZERO)
      const initialEvents = await getEvents(erc677Token, { event: '_Mint' })
      expect(initialEvents.length).to.be.equal(0)
      expect(await erc677Token.totalSupply()).to.be.bignumber.equal(ZERO)

      // can't be called by user
      await homeBridge.handleBridgedTokens(user, oneEther, { from: user }).should.be.rejectedWith(ERROR_MSG)
      // can't be called by owner
      await homeBridge.handleBridgedTokens(user, oneEther, { from: owner }).should.be.rejectedWith(ERROR_MSG)

      const data = await homeBridge.contract.methods.handleBridgedTokens(user, oneEther.toString()).encodeABI()

      // message must be generated by mediator contract on the other network
      await ambBridgeContract.executeMessageCall(homeBridge.address, owner, data, otherMessageId, 1000000).should.be
        .fulfilled

      expect(await ambBridgeContract.messageCallStatus(otherMessageId)).to.be.equal(false)

      await ambBridgeContract.executeMessageCall(
        homeBridge.address,
        mediatorContract.address,
        data,
        exampleMessageId,
        1000000
      ).should.be.fulfilled

      expect(await ambBridgeContract.messageCallStatus(exampleMessageId)).to.be.equal(true)

      // Then
      expect(await homeBridge.totalExecutedPerDay(currentDay)).to.be.bignumber.equal(oneEther)
      const events = await getEvents(erc677Token, { event: '_Mint' })
      expect(events.length).to.be.equal(1)
      expect(events[0].returnValues.to).to.be.equal(user)
      expect(events[0].returnValues.amount).to.be.equal(oneEther.toString())
      expect(await erc677Token.totalSupply()).to.be.bignumber.equal(oneEther)
      expect(await erc677Token.balanceOf(user)).to.be.bignumber.equal(oneEther)

      const TokensBridgedEvent = await getEvents(homeBridge, { event: 'TokensBridged' })
      expect(TokensBridgedEvent.length).to.be.equal(1)
      expect(TokensBridgedEvent[0].returnValues.recipient).to.be.equal(user)
      expect(TokensBridgedEvent[0].returnValues.value).to.be.equal(oneEther.toString())
      expect(TokensBridgedEvent[0].returnValues.messageId).to.be.equal(exampleMessageId)
    })
    for (const decimalShift of [2, -1]) {
      it(`should mint tokens on message from amb with decimal shift of ${decimalShift}`, async () => {
        // Given
        const homeBridgeImpl = await HomeAMBErc677ToErc677.new()
        const homeBridgeProxy = await Eip1967Proxy.new(homeBridgeImpl.address).should.be.fulfilled
        homeBridge = await HomeAMBErc677ToErc677.at(homeBridgeProxy.address)

        erc677Token = await ERC677BridgeToken.new('test', 'TST', 18)
        await erc677Token.setBridgeContract(homeBridge.address)
        await erc677Token.transferOwnership(homeBridge.address)

        await homeBridge.initialize(
          ambBridgeContract.address,
          mediatorContract.address,
          erc677Token.address,
          [dailyLimit, maxPerTx, minPerTx],
          [executionDailyLimit, executionMaxPerTx],
          maxGasPerTx,
          decimalShift,
          owner
        ).should.be.fulfilled

        const currentDay = await homeBridge.getCurrentDay()
        expect(await homeBridge.totalExecutedPerDay(currentDay)).to.be.bignumber.equal(ZERO)
        const initialEvents = await getEvents(erc677Token, { event: '_Mint' })
        expect(initialEvents.length).to.be.equal(0)
        expect(await erc677Token.totalSupply()).to.be.bignumber.equal(ZERO)

        const valueOnForeign = toBN('1000')
        const valueOnHome = toBN(valueOnForeign * 10 ** decimalShift)

        const data = await homeBridge.contract.methods.handleBridgedTokens(user, valueOnForeign.toString()).encodeABI()

        // message must be generated by mediator contract on the other network
        await ambBridgeContract.executeMessageCall(homeBridge.address, owner, data, otherMessageId, 1000000).should.be
          .fulfilled

        expect(await ambBridgeContract.messageCallStatus(otherMessageId)).to.be.equal(false)

        await ambBridgeContract.executeMessageCall(
          homeBridge.address,
          mediatorContract.address,
          data,
          exampleMessageId,
          1000000
        ).should.be.fulfilled

        expect(await ambBridgeContract.messageCallStatus(exampleMessageId)).to.be.equal(true)

        // Then
        expect(await homeBridge.totalExecutedPerDay(currentDay)).to.be.bignumber.equal(valueOnForeign)
        const events = await getEvents(erc677Token, { event: '_Mint' })
        expect(events.length).to.be.equal(1)
        expect(events[0].returnValues.to).to.be.equal(user)
        expect(events[0].returnValues.amount).to.be.equal(valueOnHome.toString())
        expect(await erc677Token.totalSupply()).to.be.bignumber.equal(valueOnHome)
        expect(await erc677Token.balanceOf(user)).to.be.bignumber.equal(valueOnHome)

        const TokensBridgedEvent = await getEvents(homeBridge, { event: 'TokensBridged' })
        expect(TokensBridgedEvent.length).to.be.equal(1)
        expect(TokensBridgedEvent[0].returnValues.recipient).to.be.equal(user)
        expect(TokensBridgedEvent[0].returnValues.value).to.be.equal(valueOnHome.toString())
        expect(TokensBridgedEvent[0].returnValues.messageId).to.be.equal(exampleMessageId)
      })
    }
    it('should emit MediatorAmountLimitExceeded and not mint tokens when out of execution limits', async () => {
      // Given
      const currentDay = await homeBridge.getCurrentDay()
      expect(await homeBridge.totalExecutedPerDay(currentDay)).to.be.bignumber.equal(ZERO)
      const initialEvents = await getEvents(erc677Token, { event: '_Mint' })
      expect(initialEvents.length).to.be.equal(0)
      expect(await erc677Token.totalSupply()).to.be.bignumber.equal(ZERO)

      const outOfLimitValueData = await homeBridge.contract.methods
        .handleBridgedTokens(user, twoEthers.toString())
        .encodeABI()

      // when
      await ambBridgeContract.executeMessageCall(
        homeBridge.address,
        mediatorContract.address,
        outOfLimitValueData,
        exampleMessageId,
        1000000
      ).should.be.fulfilled

      expect(await ambBridgeContract.messageCallStatus(exampleMessageId)).to.be.equal(true)

      // Then
      expect(await homeBridge.totalExecutedPerDay(currentDay)).to.be.bignumber.equal(ZERO)
      const events = await getEvents(erc677Token, { event: '_Mint' })
      expect(events.length).to.be.equal(0)
      expect(await erc677Token.totalSupply()).to.be.bignumber.equal(ZERO)
      expect(await erc677Token.balanceOf(user)).to.be.bignumber.equal(ZERO)

      expect(await homeBridge.outOfLimitAmount()).to.be.bignumber.equal(twoEthers)
      const outOfLimitEvent = await getEvents(homeBridge, { event: 'MediatorAmountLimitExceeded' })
      expect(outOfLimitEvent.length).to.be.equal(1)
      expect(outOfLimitEvent[0].returnValues.recipient).to.be.equal(user)
      expect(outOfLimitEvent[0].returnValues.value).to.be.equal(twoEthers.toString())
      expect(outOfLimitEvent[0].returnValues.messageId).to.be.equal(exampleMessageId)

      const TokensBridgedEvent = await getEvents(homeBridge, { event: 'TokensBridged' })
      expect(TokensBridgedEvent.length).to.be.equal(0)
    })
  })
})
