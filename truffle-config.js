'use strict';

const HDWalletProvider = require("@truffle/hdwallet-provider")

const isCoverage = process.env.COVERAGE === 'true'

module.exports = {
  networks: {

    local: {
      host: 'localhost',
      port: 8545,
      gas: 6999999,
      gasPrice: 1e9,
      network_id: '*',
    },

    ksw: { // Local testnet
      host: 'localhost',
      port: 8555,
      gas: 6999999,
      gasPrice: 20e9,
      network_id: 2021,
    },

    kovan: { // Testnet simulating the mainnet
      provider: () => new HDWalletProvider(
        process.env.HDWALLET_MNEMONIC,
        process.env.INFURA_PROVIDER_URL,
      ),
      skipDryRun: true,
      network_id: 4,
      gas: 6980000,
      gasPrice: 2.001e9,
    },

    sokol: { // Testnet simulating the xDai
      provider: () => new HDWalletProvider(
          process.env.HDWALLET_MNEMONIC,
          'https://sokol.poa.network',
      ),
      network_id: 77,
      gas: 6999999,
      gasPrice: 1e9,
    },

    mainnet: { // Production main chain
      provider: () => new HDWalletProvider(
        process.env.HDWALLET_MNEMONIC,
        process.env.INFURA_PROVIDER_URL_MAINNET,
      ),
      skipDryRun: true,
      network_id: 1,
      gas: 7000000,
      gasPrice: 30e9,
    },

    xdai: { // Production side-chain
      provider: () => new HDWalletProvider(
        process.env.HDWALLET_MNEMONIC,
        process.env.XDAI_PROVIDER || 'https://dai.poa.network',
      ),
      network_id: 100,
      gas: 6999999,
      gasPrice: 1e9,
    }
  },

  api_keys: {
    etherscan: `${process.env.ETHERSCAN_APIKEY}`
  },

  plugins: [
      // "solidity-coverage",
      'truffle-plugin-verify'
  ],

  fix_paths: true,
  solc_log: true,
  compilers: {
    solc: {
      version: "0.6.12",
      docker: false,
      parser: "solcjs",
      settings: {
        optimizer: {
          enabled: !isCoverage,
          runs: 200
        },
      },
    }
  },

  mocha: isCoverage ? {
    reporter: 'mocha-junit-reporter',
  } : {
    reporter: 'eth-gas-reporter',
    reporterOptions : {
      currency: 'USD',
      gasPrice: 200
    }
  },
};
