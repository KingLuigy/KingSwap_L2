'use strict';

const HDWalletProvider = require("@truffle/hdwallet-provider")

const isCoverage = process.env.COVERAGE === 'true'

module.exports = {
  networks: {

    local: {
      host: 'localhost',
      port: 8545,
      gas: 6999999,
      gasPrice: 1000000000,
      network_id: '*'
    },

    ksw: {
      host: 'localhost',
      port: 8555,
      gas: 6999999,
      gasPrice: 20 * 1000000000,
      network_id: '*'
    },

    rinkeby: {
      provider: () => new HDWalletProvider(
        process.env.HDWALLET_MNEMONIC,
        process.env.INFURA_PROVIDER_URL,
      ),
      skipDryRun: true,
      network_id: 4,
      gas: 6980000,
      gasPrice: 2.001 * 1000000000
    },

    mainnet: {
      provider: () => new HDWalletProvider(
        process.env.HDWALLET_MNEMONIC,
        process.env.INFURA_PROVIDER_URL_MAINNET,
      ),
      skipDryRun: true,
      network_id: 1,
      gas: 7000000,
      gasPrice: 3.01 * 1000000000
    },

    kovan: {
      provider: () => new HDWalletProvider(
        process.env.HDWALLET_MNEMONIC,
        process.env.INFURA_PROVIDER_URL_KOVAN,
      ),
      skipDryRun: true,
      network_id: 42
    },

    mainnet_fork: {
      provider: () => new HDWalletProvider(
        process.env.HDWALLET_MNEMONIC,
        process.env.LOCALHOST_URL,
      ),
      gas: 7000000,
      network_id: 999
      // gasPrice: 11.101 * 1000000000
    },

    xdai: {
      provider: () => new HDWalletProvider(
        process.env.HDWALLET_MNEMONIC,
        process.env.XDAI_PROVIDER || 'https://rpc.xdaichain.com/',
      ),
      gas: 7000000,
      network_id: 100
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
  }
};
