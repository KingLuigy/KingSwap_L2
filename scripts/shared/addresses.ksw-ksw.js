module.exports = {
  // ksw simulates both the "layer1 chain" and the "side-chain"

  // AMB contract on the layer1 chain
  ambAddress: '0x3aaB397F7d96Fe4C6d6541B3E59911B8e40281c1', // accounts[8]
  // AMB contract on the side-chain
  xAmbAddress: '0xFd74522B1705579f69670e8Ba201624B2414CA8C', // accounts[9]

  // $KING token on the layer1 chain (original token)
  kingTokenAddress: '0x0000000000000000000000000000000000000000', // ToDo: update
  // x$KING token on the side-chain (replica of the $KING)
  xKingTokenAddress: '0x0000000000000000000000000000000000000000', // ToDo: update

  // ERC1155 on the layer1 chain (replica of the side-chain ERC1155)
  Erc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
  // ERC1155 on the side-chain (original tokens)
  xErc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
}
