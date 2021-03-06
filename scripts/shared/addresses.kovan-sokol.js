
module.exports = {
  "layer1 chain": "kovan",
  "side-chain": "sokol",

  // AMB contract on the layer1 chain
  ambAddress: '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560',
  // AMB contract on the side-chain
  xAmbAddress: '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560',

  // AMB-extension contract (aka "mediator") for ERC20 on the layer1 chain
  ambErc20ExtAddress: '0x4a493Af3cC8fb1385800ac92b3137DB20949194b', // proxy
  ambErc20ExtImplAddress: '0x5A312Ee76A421a9f88AF0581c6AFE3b313b6C358', // implementation

  // AMB-mediator contract (aka "mediator") for ERC20 on the side-chain
  xAmbErc20ExtAddress: '0x15390f348e49135D06Ed6B9c968223aeD108E105', // proxy
  xAmbErc20ExtImplAddress: '0xe35973aee228883aE687830243b413470F665Aa7', // implementation

  // AMB-mediator contract (aka "mediator") for ERC1155 on the layer1 chain
  ambErc1155ExtAddress: '0x0000000000000000000000000000000000000000', // proxy // ToDo: update
  ambErc1155ExtImplAddress: '0x0000000000000000000000000000000000000000', // implementation // ToDo: update

  // AMB-mediator (aka "mediator") contract for ERC1155 on the side-chain
  xAmbErc1155ExtAddress: '0x0000000000000000000000000000000000000000', // proxy // ToDo: update
  xAmbErc1155ExtImplAddress: '0x0000000000000000000000000000000000000000', // implementation // ToDo: update

  // $KING token on the layer1 chain (original token)
  kingTokenAddress: '0x0fc69EC9DB3643FFAF3164Ed9B486330C29B5A3c', // un-proxied

  // x$KING token on the side-chain (replica of the $KING)
  xKingTokenAddress: '0xd15Ee89DD37E62d131e382c8df7911CE872bf74D', // proxy
  xKingTokenImplAddress: '0x3a0A529b809d3B761465e492E1b285e094A3b6B6', // implementation

  // ERC1155 on the layer1 chain (replica of the side-chain ERC1155)
  Erc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
  // ERC1155 on the side-chain (original tokens)
  xErc1155Address: '0x0000000000000000000000000000000000000000', // proxy // ToDo: update
  xErc1155ImplAddress: '0x0000000000000000000000000000000000000000', // implementation // ToDo: update
}
