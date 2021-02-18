
module.exports = {
  "layer1 chain": "kovan",
  "side-chain": "sokol",

  // AMB contract on the layer1 chain
  ambAddress: '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560',
  // AMB contract on the side-chain
  xAmbAddress: '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560',

  // AMB-mediator (extension) contract for ERC20 on the layer1 chain
  ambErc20ExtAddress: '0x0000000000000000000000000000000000000000', // ToDo: update
  // AMB-mediator (extension) contract for ERC20 on the side-chain
  xAmbErc20ExtAddress: '0x0000000000000000000000000000000000000000', // ToDo: update

  // AMB-mediator (extension) contract for ERC1155 on the layer1 chain
  ambErc1155ExtAddress: '0x0000000000000000000000000000000000000000', // ToDo: update
  // AMB-mediator (extension) contract for ERC1155 on the side-chain
  xAmbErc1155ExtAddress: '0x0000000000000000000000000000000000000000', // ToDo: update

  // $KING token on the layer1 chain (original token)
  kingTokenAddress: '0x0000000000000000000000000000000000000000', // ToDo: update
  // x$KING token on the side-chain (replica of the $KING)
  xKingTokenAddress: '0xd15Ee89DD37E62d131e382c8df7911CE872bf74D',

  // ERC1155 on the layer1 chain (replica of the side-chain ERC1155)
  Erc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
  // ERC1155 on the side-chain (original tokens)
  xErc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
}
