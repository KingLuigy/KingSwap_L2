const SafeTransfers = artifacts.require('SafeTransfersMock.sol')
const KingToken = require('../resources/kingswap_v2/KingToken.json')
// const MockToken = artifacts.require('ERC20Mock')
const { expect } = require('chai')
const { ether } = require('./helpers/helpers')
const { ZERO_ADDRESS } = require('./helpers/setup')

const oneEther = ether('1')
const oneEtherStr = oneEther.toString()
const ERROR_MSG = "SafeTransfers: TRANSFER_FAILED"

contract('SafeTransfers Lib', async accounts => {
  const deployer = accounts[0]
  const tokenOwner = accounts[1]
  const to = accounts[2]
  const anotherAccount = accounts[5]

  beforeEach(async function() {
    this.safeTransfers = await SafeTransfers.new({ from: deployer })
    this.contractAddr = this.safeTransfers.address

    // const token = await MockToken.new("t1", "T1", 18, { from: anotherAccount })
    // this.token = new web3.eth.Contract(MockToken.abi, token.address)
    this.token = await (
        new web3.eth.Contract(KingToken.abi, {data: KingToken.bytecode})
    ).deploy({arguments: []}).send({from: anotherAccount, gas: 5000000})
    this.tokenAddr = this.token.options.address
  })

  describe('transfer function', () => {
    beforeEach(async function() {
      await this.token.methods.mint(this.contractAddr, oneEtherStr).send({ from: anotherAccount })
      expect(await this.token.methods.balanceOf(this.contractAddr).call()).to.be.equal(oneEtherStr)
    })

    describe('when the recipient is not the zero address', function () {
      describe('when the contract does not have enough balance', function () {
        const amount = oneEther.addn(1).toString()

        it('reverts', async function () {
          await this.safeTransfers._mockTransfer(this.tokenAddr, to, amount)
              .should.be.rejectedWith(ERROR_MSG)
        })
      })

      describe('when the contract transfers less than balance', function () {
        const amount = oneEther.subn(1).toString()

        it('transfers the requested amount', async function () {
          await this.safeTransfers._mockTransfer(this.tokenAddr, to, amount)

          expect(await this.token.methods.balanceOf(this.contractAddr).call()).to.be.equal('1')
          expect(await this.token.methods.balanceOf(to).call()).to.be.equal(amount)
        })
      })

      describe('when the contract transfers all balance', function () {
        const amount = oneEtherStr

        it('transfers the requested amount', async function () {
          await this.safeTransfers._mockTransfer(this.tokenAddr, to, amount)

          expect(await this.token.methods.balanceOf(this.contractAddr).call()).to.be.equal('0')
          expect(await this.token.methods.balanceOf(to).call()).to.be.equal(amount)
        })
      })

      describe('when the contract transfers zero tokens', function () {
        const amount = '0'

        it('transfers the requested amount', async function () {
          await this.safeTransfers._mockTransfer(this.tokenAddr, to, amount)

          expect(await this.token.methods.balanceOf(this.contractAddr).call()).to.be.equal(oneEtherStr)
          expect(await this.token.methods.balanceOf(to).call()).to.be.equal('0')
        })
      })
    })

    describe('when the recipient is the zero address', function () {
      const amount = oneEtherStr

      it('reverts', async function () {
        await this.safeTransfers._mockTransfer(this.tokenAddr, ZERO_ADDRESS, amount)
            .should.be.rejectedWith(ERROR_MSG)
      })
    })
  })

  describe('transferFrom function', function () {
    beforeEach(async function() {
      await this.token.methods.mint(tokenOwner, oneEtherStr).send({ from: anotherAccount })
      expect(await this.token.methods.balanceOf(tokenOwner).call()).to.be.equal(oneEtherStr)
    })

    describe('when the token owner is not the zero address', function () {
      describe('when the recipient is not the zero address', function () {
        const to = anotherAccount

        describe('when the contract has enough approved balance', function () {
          beforeEach(async function () {
            await this.token.methods.approve(this.contractAddr, oneEtherStr).send({ from: tokenOwner })
            expect(await this.token.methods.allowance(tokenOwner, this.contractAddr).call()).to.be.equal(oneEtherStr)
          })

          describe('when the token owner has enough balance', function () {

            describe('when the contract spends all approved balance', function () {
              const amount = oneEtherStr

              it('transfers the requested amount', async function () {
                await this.safeTransfers._mockTransferFrom(this.tokenAddr, tokenOwner, to, amount)

                expect(await this.token.methods.balanceOf(tokenOwner).call()).to.be.equal('0')
                expect(await this.token.methods.balanceOf(to).call()).to.be.equal(amount)
              })

              it('decreases the contract allowance', async function () {
                await this.safeTransfers._mockTransferFrom(this.tokenAddr, tokenOwner, to, amount)
                expect(await this.token.methods.allowance(tokenOwner, this.contractAddr).call()).to.be.equal('0')
              })
            })

            describe('when the contract spends less than approved balance', function () {
              const amount = oneEther.subn(1)

              beforeEach(async function () {
                await this.token.methods.approve(this.contractAddr, amount).send({ from: tokenOwner })
                expect(await this.token.methods.allowance(tokenOwner, this.contractAddr).call())
                    .to.be.bignumber.equal(amount)
              })

              it('transfers the requested amount', async function () {
                await this.safeTransfers._mockTransferFrom(this.tokenAddr, tokenOwner, to, amount)

                expect(await this.token.methods.balanceOf(tokenOwner).call()).to.be.equal('1')
                expect(await this.token.methods.balanceOf(to).call()).to.be.equal(amount.toString())
              })

              it('decreases the contract allowance', async function () {
                await this.safeTransfers._mockTransferFrom(this.tokenAddr, tokenOwner, to, amount)
                expect(await this.token.methods.allowance(tokenOwner, this.contractAddr).call()).to.be.equal('0')
              })
            })

            describe('when the contract requests to its address all approved balance', function () {
              const amount = oneEtherStr
              it('transfers the requested amount', async function () {
                await this.safeTransfers._mockTransferFrom(this.tokenAddr, tokenOwner, this.contractAddr, amount)

                expect(await this.token.methods.balanceOf(tokenOwner).call()).to.be.equal('0')
                expect(await this.token.methods.balanceOf(this.contractAddr).call()).to.be.equal(amount)
              })
            })
          });

          describe('when the token owner does not have enough balance', function () {
            const amount = oneEther.addn(1)

            it('reverts', async function () {
              await this.safeTransfers._mockTransferFrom(this.tokenAddr, tokenOwner, to, amount)
                  .should.be.rejectedWith(ERROR_MSG)
            })
          })
        })

        describe('when the contract does not have enough approved balance', function () {
          beforeEach(async function () {
            await this.token.methods.approve(this.contractAddr, oneEther.subn(1)).send({ from: tokenOwner })
          })

          describe('when the token owner has enough balance', function () {
            const amount = oneEtherStr

            it('reverts', async function () {
              await this.safeTransfers._mockTransferFrom(this.tokenAddr, tokenOwner, to, amount)
                  .should.be.rejectedWith(ERROR_MSG)
            })
          })

          describe('when the token owner does not have enough balance', function () {
            const amount = oneEther.addn(1)

            it('reverts', async function () {
              await this.safeTransfers._mockTransferFrom(this.tokenAddr, tokenOwner, to, amount)
                  .should.be.rejectedWith(ERROR_MSG)
            })
          })
        })
      })
    })

    describe('when the token owner is the zero address', function () {
      const amount = 0
      const tokenOwner = ZERO_ADDRESS

      it('reverts', async function () {
        await this.safeTransfers._mockTransferFrom(this.tokenAddr, tokenOwner, to, amount)
            .should.be.rejectedWith(ERROR_MSG)
      })
    })
  })
})
