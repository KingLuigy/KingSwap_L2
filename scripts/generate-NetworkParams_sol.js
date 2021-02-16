#!/usr/bin/env node
const fs = require('fs');
const { join } = require('path');
const { isAddress } = require('web3').utils;
const { networks } = require('../truffle-config');

const networkAlias = getNetworkAlias();
if (!networkAlias) panic('unknown network alias');
fs.writeFileSync(
    join(__dirname, '../contracts/NetworksParams.sol'),
    getContent(networks[networkAlias].contracts, networkAlias),
);
process.exit(0);

function getContent(contracts, networkAlias) {
  const params = {
    "ksw-ksw": { // ksw is both the "layer1 chain" and the "side-chain"
      // AMB contract on the layer1 chain
      ambAddress: '0x0000000000000000000000000000000000000000', // not in use for these chains
      // AMB contract on the side-chain
      xAmbAddress: '0x0000000000000000000000000000000000000000', // not in use for these chains

      // $KING token on the layer1 chain (original token)
      kingTokenAddress: '0x0000000000000000000000000000000000000000', // ToDo: update
      // x$KING token on the side-chain (replica of the $KING)
      xKingTokenAddress: '0x0000000000000000000000000000000000000000', // ToDo: update

      // ERC1155 on the layer1 chain (replica of the side-chain ERC1155)
      Erc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
      // ERC1155 on the side-chain (original tokens)
      xErc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
    },

    "mainnet-xdai": { // mainnet is the "layer1 chain" and xdai is the "side-chain"
      // AMB contract on the layer1 chain
      ambAddress: '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e',
      // AMB contract on the side-chain
      xAmbAddress: '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59',

      // $KING token on the layer1 chain (original token)
      kingTokenAddress: '0xd2057d71fe3f5b0dc1e3e7722940e1908fc72078',
      // x$KING token on the side-chain (replica of the $KING)
      xKingTokenAddress: '0x0000000000000000000000000000000000000000', // ToDo: update

      // ERC1155 on the layer1 chain (replica of the side-chain ERC1155)
      Erc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
      // ERC1155 on the side-chain (original tokens)
      xErc1155Address: '0x0000000000000000000000000000000000000000', // ToDo: update
    },

    "kovan-sokol": {// kovan is the "layer1 chain" and sokol is the "side-chain"
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
    },
  }

  const getParam = (alias) => params[networkAlias][alias];
  const getAddress = (alias) => isAddress(getParam(alias))
    ? getParam(alias)
    : panic(`invalid address (${alias})`);

  return `// Note:
// This file is generated for the "${networkAlias}" networks 
// by the 'generate-NetworkParams_sol.js' script.
// Do not edit it directly - updates will be lost.

// SPDX-License-Identifier: MIT
pragma solidity >=0.6 <0.8.0;


/// @dev Network-dependant params (i.e. addresses, block numbers, etc..)
contract NetworkParams {
    // Bridge contracts addresses
    address internal constant ambAddress = ${getAddress('ambAddress')};
    address internal constant xAmbAddress = ${getAddress('xAmbAddress')};

    // Token contract addresses
    address internal constant kingTokenAddress = ${getAddress('kingTokenAddress')};
    address internal constant Erc1155Address = ${getAddress('Erc1155Address')};
    address internal constant xErc1155Address = ${getAddress('xErc1155Address')};
    address internal constant xKingTokenAddress = ${getAddress('xKingTokenAddress')};
}
`
}

function getNetworkAlias() {
  const i = process.argv.findIndex(e => e === '--network');
  if (i < 0 || i === process.argv.length - 1) panic('invalid or missing --network alias');
  return process.argv[i + 1];
}

function panic(msg) {
  console.error(msg);
  process.exit(-1);
}
