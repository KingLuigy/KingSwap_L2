# Multi-Token Standard (ERC1155) implementation

The contracts in this repository contain an [ERC155PackedBalance](https://github.com/0xsequence/multi-token-standard/tree/master/contracts/tokens/ERC1155PackedBalance) implementation of the ERC-1155 standard.

To save transaction costs, the implementation packs multiple balances within a single `uint256` using bitwise operations.

[ERC-1155](https://github.com/ethereum/EIPs/issues/1155) contracts keep track of many token balances, which can lead to significant efficiency gains when batch transferring multiple token classes simultaneously.

__Source:__ [https://github.com/0xsequence/multi-token-standard](https://github.com/0xsequence/multi-token-standard)
