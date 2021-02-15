**The "KingSwap Layer2 DApp" is a work in progress and has NOT been audited. Use at your own risk.**

## Documentation
See [./docs](https://gihub.com/KingLuigy/KingSwap_V3/tree/master/docs).

## Packages

This is a monorepo containing all packages related to the "KingSwap Layer2 DApp".

| Package                                                                          | Description                                                                    |
|----------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| [kingswapBridge](https://gihub.com/KingLuigy/KingSwap_V3/tree/master/packages/kingswapBridge/ ) | Mediators for xDai <-> Ethereum bridge |
| [kingswapErc1155](https://gihub.com/KingLuigy/KingSwap_V3/tree/master/packages/kingswapErc1155/ ) | ERC1155 for Ethereum and xDai networks |
| [kingswapUni](https://gihub.com/KingLuigy/KingSwap_V3/tree/master/packages/kingswapUni/ ) | Uniswap v2 (SakeSwap version) clone to run on xDai network |
| [kingswapV3](https://gihub.com/KingLuigy/KingSwap_V3/tree/master/packages/kingswapV3/ ) | KingSwap V2 staking/deposit smart contracts to run on xDai network |
| [kingToken](https://gihub.com/KingLuigy/KingSwap_V3/tree/master/packages/kingToken/ ) | $KING token counterpart that runs on xDai network |

## Development
### Requirements
The versions provided are confirmed to work without any issues. Newer or older versions of the packages might work too.
- [node](https://nodejs.org/en/) [10.16.0] (recommended installing it via [nvm](https://github.com/nvm-sh/nvm))
- [yarn](https://yarnpkg.com/) [1.16.0] (recommended installing it as global npm package)

### Setup
```sh
yarn install
yarn bootstrap
```

### Building
```sh
yarn build
```

### Testing
```sh
yarn test
```
