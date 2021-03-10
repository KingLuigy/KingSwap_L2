module.exports = {
  "layer1 chain": "mainnet",
  "side-chain": "xdai",

  // AMB contract on the layer1 chain
  ambAddress: '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e',
  // AMB contract on the side-chain
  xAmbAddress: '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59',

  // AMB-extension contract for $KING->x$KING (aka "new" $KING) on the layer1 chain
  ambErc20ExtAddress: '0xD1843507c588e5D0e11413b29779cC97E14e0242', // proxy
  ambErc20ExtImplAddress: '0x7d83901201e78cb4e883a5f172a86907ba9065b3', // implementation

  // AMB-extension contract for old$KING->xo$KING (aka "old" $KING) on the layer1 chain
  ambOldErc20ExtAddress: '0x24DD13C6b54E1538061FE8cda14E0C7F27BE9363', // proxy
  ambOldErc20ExtImplAddress: '0xC604A898bd253C43595808298b3Baac57926F858', // implementation

  // AMB-mediator contract for $KING->x$KING (aka "new" $KING) on the side-chain
  xAmbErc20ExtAddress: '0x4c9c971fbEFc93E0900988383DC050632dEeC71E', // proxy
  xAmbErc20ExtImplAddress: '0x862E242c46987955F806014AEF362c9551030936', // implementation

  // AMB-mediator contract for old$KING->xo$KING (aka "old" $KING) on the side-chain
  xOldAmbErc20ExtAddress: '0x4EdC94bC630Ee57A7D3FFeDaa03498430B7353ED', // proxy
  xOldAmbErc20ExtImplAddress: '0x400294716f347532107D7e2d034BA1fcb4fb84b7', // implementation

  // $KING token (aka "new" $KING) on the layer1 chain (original token)
  kingTokenAddress: '0xd2057d71fe3f5b0dc1e3e7722940e1908fc72078', // un-proxied

  // old$KING token (aka "old" $KING) on the layer1 chain (original token)
  kingOldTokenAddress: '0x5a731151d6510Eb475cc7a0072200cFfC9a3bFe5', // un-proxied

  // x$KING token on the side-chain (replica of the $KING)
  xKingTokenAddress: '0xcCd05d20Cc7f1994425Dd21A8939A222D433cD1C', // proxy
  xKingTokenImplAddress: '0xb0591e6793b19BB577e3696C25c2FF5AC03356d9', // implementation

  // xo$KING token on the side-chain (replica of the old$KING)
  xoKingTokenAddress: '0x27dc94013361e787d36134CA415688DD518AdE1c', // proxy
  xoKingTokenImplAddress: '0x696a99d09f13696f1C6F49F6aee140A469c19B4c', // implementation

  // ERC1155 on the layer1 chain (replica of the side-chain ERC1155)
  Erc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
  // ERC1155 on the side-chain (original tokens)
  xErc1155Address: '0xe26e5c3297e00321683Ca5aB242A77bef947E3e9', // proxy
  xErc1155ImplAddress: '0xD268e1D0d7EfF481A989772988B00e2Bb3d90685', // implementation

  // KingSwapRouter on the side-chain
  xKingSwapRouter: '0xb3E5FD863A5394611880cEbBE9D4E8dc4a7710cd',
  // KingSwapFactory on the side-chain
  xKingSwapFactory: '0x977cFffecE847529190e6771DfEacDd7B5659f9B',
  // WETH on the side-chain
  xWETH: '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1'
}
