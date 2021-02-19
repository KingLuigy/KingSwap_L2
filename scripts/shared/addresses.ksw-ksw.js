module.exports = {
  "layer1 chain": "ksw",
  "side-chain": "ksw",

  // AMB contract on the layer1 chain
  ambAddress: '0x3aaB397F7d96Fe4C6d6541B3E59911B8e40281c1', // accounts[8]
  // AMB contract on the side-chain
  xAmbAddress: '0xFd74522B1705579f69670e8Ba201624B2414CA8C', // accounts[9]

  // AMB-mediator (extension) contract for ERC20 on the layer1 chain
  ambErc20ExtAddress: '0x01d119AcB7f0E7DF376490e3B0c5548B7c82aE2F', // accounts[6]
  // AMB-mediator (extension) contract for ERC20 on the side-chain
  xAmbErc20ExtAddress: '0x04557A287f4f4d2cc8fB0ffF0ea910dfb8b442fF', // accounts[7]

  // AMB-mediator (extension) contract for ERC1155 on the layer1 chain
  ambErc1155ExtAddress: '0x0000000000000000000000000000000000000000', // ToDo: update
  // AMB-mediator (extension) contract for ERC1155 on the side-chain
  xAmbErc1155ExtAddress: '0x0000000000000000000000000000000000000000', // ToDo: update

  // $KING token on the layer1 chain (original token)
  kingTokenAddress: '0x0000000000000000000000000000000000000000', // ToDo: update
  // x$KING token on the side-chain (replica of the $KING)
  xKingTokenAddress: '0x0000000000000000000000000000000000000000', // ToDo: update

  // ERC1155 on the layer1 chain (replica of the side-chain ERC1155)
  Erc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
  // ERC1155 on the side-chain (original tokens)
  xErc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
}
