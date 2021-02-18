module.exports = {
  "layer1 chain": "mainnet",
  "side-chain": "xdai",

  // AMB contract on the layer1 chain
  ambAddress: '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e',
  // AMB contract on the side-chain
  xAmbAddress: '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59',

  // AMB-mediator (extension) contract for ERC20 on the layer1 chain
  ambErc20ExtAddress: '0x0000000000000000000000000000000000000000', // ToDo: update
  // AMB-mediator (extension) contract for ERC20 on the side-chain
  xAmbErc20ExtAddress: '0x0000000000000000000000000000000000000000', // ToDo: update

  // AMB-mediator (extension) contract for ERC1155 on the layer1 chain
  ambErc1155ExtAddress: '0x0000000000000000000000000000000000000000', // ToDo: update
  // AMB-mediator (extension) contract for ERC1155 on the side-chain
  xAmbErc1155ExtAddress: '0x0000000000000000000000000000000000000000', // ToDo: update

  // $KING token on the layer1 chain (original token)
  kingTokenAddress: '0xd2057d71fe3f5b0dc1e3e7722940e1908fc72078',
  // x$KING token on the side-chain (replica of the $KING)
  xKingTokenAddress: '0x0000000000000000000000000000000000000000', // ToDo: update

  // ERC1155 on the layer1 chain (replica of the side-chain ERC1155)
  Erc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
  // ERC1155 on the side-chain (original tokens)
  xErc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update

}
