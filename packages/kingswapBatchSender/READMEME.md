This folder contains the source files and tests for the Arbitrary Message Bridge (AMB) extensions (aka "mediators") to work with the AMB(s) built by the _["tokenbridge-contracts" project by "POA network"](https://github.com/poanetwork/tokenbridge-contracts)_

The _["tokenbridge-contracts" project by "POA network"](https://github.com/poanetwork/tokenbridge-contracts)_ is the source of the major part of the code in this folder.

The original source files was adopted as follows:
- only the source code needed to build (and test) the two target smart contracts, being the [HomeAMBErc677ToErc677.sol](./contracts/HomeAMBErc677ToErc677.sol) and the [ForeignAMBErc677ToErc677.sol](./contracts/ForeignAMBErc677ToErc677.sol) left
- the ERC-1967 proxy is used instead of the Eternal Storage Proxy
- Solc upgraded from `0.4.24` to `0.7.6`
- linked to other packages (contracts) of the `Kingswap_L2` package
