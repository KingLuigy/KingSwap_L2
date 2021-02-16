
module.exports = {
  // kovan is the "layer1 chain" and sokol is the "side-chain"

  // AMB contract on the layer1 chain
  ambAddress: '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560',
  // AMB contract on the side-chain
  xAmbAddress: '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560',

  // $KING token on the layer1 chain (original token)
  kingTokenAddress: '0x0000000000000000000000000000000000000000', // ToDo: update
  // x$KING token on the side-chain (replica of the $KING)
  xKingTokenAddress: '0x0000000000000000000000000000000000000000', // ToDo: update

  // ERC1155 on the layer1 chain (replica of the side-chain ERC1155)
  Erc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
  // ERC1155 on the side-chain (original tokens)
  xErc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
}
