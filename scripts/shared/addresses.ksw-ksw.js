module.exports = {
  "layer1 chain": "ksw",
  "side-chain": "ksw",

  // AMB contract on the layer1 chain
  ambAddress: '0x3aaB397F7d96Fe4C6d6541B3E59911B8e40281c1', // accounts[8]
  // AMB contract on the side-chain
  xAmbAddress: '0xFd74522B1705579f69670e8Ba201624B2414CA8C', // accounts[9]

  // AMB-extension contract for $KING->x$KING (aka "new" $KING) on the layer1 chain
  ambErc20ExtAddress: '0x01d119AcB7f0E7DF376490e3B0c5548B7c82aE2F', // accounts[6]

  // AMB-extension contract for old$KING->xo$KING (aka "old" $KING) on the layer1 chain
  ambOldErc20ExtAddress: '0x0000000000000000000000000000000000000000', // accounts[5]

  // AMB-mediator contract for $KING->x$KING (aka "new" $KING) on the side-chain
  xAmbErc20ExtAddress: '0x04557A287f4f4d2cc8fB0ffF0ea910dfb8b442fF', // accounts[7]

  // AMB-mediator contract for old$KING->xo$KING (aka "old" $KING) on the side-chain
  xOldAmbErc20ExtAddress: '0x0000000000000000000000000000000000000000', // accounts[4]

  // $KING token (aka "new" $KING) on the layer1 chain (original token)
  kingTokenAddress: '0x0000000000000000000000000000000000000000', // ToDo: update

  // xo$KING token on the side-chain (replica of the old$KING)
  xoKingTokenAddress: '0x0000000000000000000000000000000000000000', // proxy

  // old$KING token (aka "old" $KING) on the layer1 chain (original token)
  kingOldTokenAddress: '0x0000000000000000000000000000000000000000', // un-proxied

  // x$KING token on the side-chain (replica of the $KING)
  xKingTokenAddress: '0x0000000000000000000000000000000000000000', // ToDo: update
}
