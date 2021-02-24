# Kingswap ERC1155 Token(s)

This repository contains the source code for the Kingswap ERC155 token.  

The code uses the [ERC155PackedBalance](<https://github.com/0xsequence/multi-token-standard/tree/master/contracts/tokens/ERC1155PackedBalance>) implementation of the [ERC-1155](https://github.com/ethereum/EIPs/issues/1155) contract.    
_Source (adopted):_ [0xsequence/multi-token-standard](<https://github.com/0xsequence/multi-token-standard/>) avaliable under _Apache-2.0_ license.

> ERC-1155 contracts keep track of many token balances, which can lead to significant efficiency gains when batch transferring multiple token classes simultaneously.  
> This is particularly useful for fungible tokens that are likely to be transfered together.
>
> The possible efficiency gains are more significant if the amount of tokens each address can own is capped:  
> to save transaction costs, the contract packs multiple balances within a single `uint256` using bitwise operations.

# Usage

## Dependencies
1. Install node v11,
2. Install yarn : `npm install -g yarn`
3. Install Truffle npm package: `npm install -g truffle`
4. Install dependencies `yarn install`

## Dev / running the tests
1. `yarn build`
2. `yarn test`
