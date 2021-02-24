/* global web3 */
// const { expectRevert, time } = require("@openzeppelin/test-helpers");
const LootBox = artifacts.require("LootBox");
const ClaimBounty = artifacts.require("ClaimBounty");

const xKingErc1155Abi = require("../resources/kingswap_l2/kingswapErc1155/XKingERC1155Mock.json");
const xKingTokenAbi = require("../resources/kingswap_l2/xkingtoken/XKingTokenMock.json");

contract("LootBox", (accounts) => {
  const e18 = "000000000000000000";

  beforeEach(async () => {
    this.xking = await (
        new web3.eth.Contract(xKingTokenAbi.abi, { data: xKingTokenAbi.bytecode })
    ).deploy().send({ from: accounts[0], gas: 3000000 });
    await this.xking.methods._mintMock(accounts[0], `${100e6}` + e18).send({ from: accounts[0] });

    this.kingERC1155 = await (
        new web3.eth.Contract(xKingErc1155Abi.abi, { data: xKingErc1155Abi.bytecode })
    ).deploy().send({ from: accounts[0], gas: 4500000 })
    await this.kingERC1155.methods._simulateEip1967Proxy(accounts[9]).send({ from: accounts[9] });

    this.lootbox = await LootBox.new(
        accounts[0],
        this.kingERC1155.options.address,
        this.xking.options.address,
        { from: accounts[0] }
    );

    let i;
    const bal = [];
    const prob = [];
    const id = [];
    let count = 0;
    for (i = 0; i <= 60; i++) {
      id[i] = i;
      if(i == 1){
        bal[i] = 255;
      }else if (i%3 == 0){
        bal[i] = 255;
      } else {
        bal[i] = 255;
      }
      if(i == 0 ){
        prob[i] = 0;
      }
      if(count == 1){
        prob[i] = 9200;
      }
      if(count == 2){
        prob[i] = 770;
      }
      if(count == 3){
        prob[i] = 30;
        count = 0;
      }
      count++;
      console.log("ID :" + i + "prob :" + prob[i]);
    }

    await this.lootbox.setNFTProbability(id, prob);
    await this.lootbox.setSeed(25182831283);

    this.claimBounty = await ClaimBounty.new(
        this.kingERC1155.options.address,
        accounts[0],
        this.xking.options.address,
        { from: accounts[0] }
    );

    await this.kingERC1155.methods.setCreator(this.lootbox.address, true).send({ from: accounts[9] });
    await this.kingERC1155.methods.setCreator(accounts[0], true).send({ from: accounts[9] });
    await this.kingERC1155.methods.setCreator(this.claimBounty.address, true).send({ from: accounts[9] });

    await this.xking.methods.approve(this.lootbox.address, "100000" + e18).send({ from: accounts[0] });
    await this.xking.methods.approve(this.claimBounty.address, "100000" + e18).send({ from: accounts[0] });

    await this.xking.methods.transfer(accounts[1], "1000" + e18).send({ from: accounts[0] })
    process.exit(-1)

    await new Array(9)
        .fill(0)
        .reduce(
            (promises, _, i) =>
                promises.then(() =>
                    this.xking.methods.transfer(accounts[i + 1], "1000" + e18).send({ from: accounts[0] })
                ),
            Promise.resolve()
        );

    await new Array(9)
        .fill(0)
        .reduce(
            (promises, _, i) =>
                promises.then(() =>
                    this.xking.methods.approve(this.lootbox.address, "1000" + e18).send({ from: accounts[i + 1] })
                ),
            Promise.resolve()
        );

    const getSampleBounty = () => ({
      availableQty: 33,
      nfTokens: [1, 2, 3],
      nftTokensQty: [1, 1, 1],
      prize: 10000
    });

    const bounty = [{ availableQty: 33, nfTokens: [1, 1, 3], nftTokensQty: [1, 1, 1], prize: 10000 }]

    this.sampleBounty = getSampleBounty();
    await this.claimBounty.addBounty(bounty);
  });

  it("should set correct state variables", async () => {
    const erc1155 = await this.lootbox.erc1155();
    const treasury = await this.lootbox.treasury();
    assert.equal(erc1155, this.kingERC1155.options.address,);
    assert.equal(treasury, accounts[0]);
  });

  it("Try Open Lootbox and receive ERC1155 Randomly", async () => {
    await this.lootbox.openTwenty(accounts[1], { from: accounts[0] });
    let i;
    let count = 0;
    let total = 0;
    let rtotal = 0;
    let ctotal = 0;
    let ltotal = 0;
    for (i = 0; i <= 60; i++) {
      const bal = await this.kingERC1155.balanceOf(accounts[0], i).call();
      if(bal > 0){
        total = total + bal;
      }

      if(count==1){
        console.log("Balance of ID : " + i + " = " + bal + " Common");
        if(bal > 0){
          ctotal= ctotal + bal;
        }
      }
      if(count==2){
        console.log("Balance of ID : " + i + " = " + bal + " RARE");
        if(bal > 0){
          rtotal= rtotal + bal;
        }
      }
      if(count==3){
        console.log("Balance of ID : " + i + " = " + bal + " LEGENDARY");
        count = 0;
        if(bal > 0){
          ltotal = ltotal + bal;
        }
      }
      count++;
    }
    console.log("Total :" + total);
    console.log("Total Common: " + ctotal);
    console.log("Total Rare: " + rtotal);
    console.log("Total Legendary: " + ltotal);
  });

  it("claiming Bounty", async () => {
    const nftIds = [1, 2, 3];
    const nftQty = [10, 10, 10];
    const nftQtyToClaim = [1, 1, 1];
    await this.kingERC1155.createBatch(accounts[1], nftIds, nftQty).send({ from: accounts[0] });
    await this.claimBounty.claim(1, nftIds, nftQtyToClaim, { from: accounts[1] });

    assert.equal(await this.kingERC1155.balanceOf(accounts[1], 1).call(), '9');
    assert.equal(await this.kingERC1155.balanceOf(accounts[1], 2).call(), '9');
    assert.equal(await this.kingERC1155.balanceOf(accounts[1], 3).call(), '9');
    console.log("Balance of Account[1] :" + await this.xking.methods.balanceOf(accounts[1]).call());
    assert.equal(await this.xking.methods.balanceOf(accounts[1]).call(), '1000000000000000010000');
  });
})
