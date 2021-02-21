module.exports = {
  "layer1 chain": "mainnet",
  "side-chain": "xdai",

  // AMB contract on the layer1 chain
  ambAddress: '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e',
  // AMB contract on the side-chain
  xAmbAddress: '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59',

  // AMB-extension contract (aka "mediator") for ERC20 on the layer1 chain
  ambErc20ExtAddress: '0xD1843507c588e5D0e11413b29779cC97E14e0242', // proxy
  ambErc20ExtImplAddress: '0xdd41339C7F3E34AbE98700d991465bc6D2B56c02', // implementation

  // AMB-mediator contract (aka "mediator") for ERC20 on the side-chain
  xAmbErc20ExtAddress: '0x4c9c971fbEFc93E0900988383DC050632dEeC71E', // proxy
  xAmbErc20ExtImplAddress: '0x378A34766e47fCA04c02d52b3836F4F171b52094', // implementation

  // AMB-mediator contract (aka "mediator") for ERC1155 on the layer1 chain
  ambErc1155ExtAddress: '0x24DD13C6b54E1538061FE8cda14E0C7F27BE9363', // proxy
  ambErc1155ExtImplAddress: '0x0000000000000000000000000000000000000000', // implementation // ToDo: update

  // AMB-mediator (aka "mediator") contract for ERC1155 on the side-chain
  xAmbErc1155ExtAddress: '0x4EdC94bC630Ee57A7D3FFeDaa03498430B7353ED', // proxy
  xAmbErc1155ExtImplAddress: '0x0000000000000000000000000000000000000000', // implementation // ToDo: update

  // $KING token on the layer1 chain (original token)
  kingTokenAddress: '0xd2057d71fe3f5b0dc1e3e7722940e1908fc72078', // un-proxied

  // x$KING token on the side-chain (replica of the $KING)
  xKingTokenAddress: '0xcCd05d20Cc7f1994425Dd21A8939A222D433cD1C', // proxy
  xKingTokenImplAddress: '0xd382dFF7Fc42c7f1CCC4CD4275146d7e5A21811D', // implementation

  // ERC1155 on the layer1 chain (replica of the side-chain ERC1155)
  Erc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
  // ERC1155 on the side-chain (original tokens)
  xErc1155Address: '0xe26e5c3297e00321683Ca5aB242A77bef947E3e9', // proxy
  xErc1155ImplAddress: '0x0000000000000000000000000000000000000000', // implementation // ToDo: update
}
