pragma solidity ^0.7.6;

import "./XKingErc1155.sol";


/**
 * @title KingERC1155
 * KingERC1155 - ERC1155 contract with extra functionality:
 * operators, create/mint, uri(), name(), symbol(), totalSupply(), meta-transactions, OpenSea support
 * It is supposed to run on the mainnet, "behind" the EIP-1967 proxy
 */
contract KingERC1155 is XKingERC1155 {

    address proxyRegistryAddress;

    /**
     * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-free listings.
     */
    function isApprovedForAll(
        address _owner,
        address _operator
    ) public view override returns (bool isOperator) {
        isOperator = super.isApprovedForAll(_owner, _operator) || (
            address(ProxyRegistry(proxyRegistryAddress).proxies(_owner)) == _operator
        );
    }

    function initialize(address proxyRegistry) public {
        XKingERC1155.initialize();
        proxyRegistryAddress = proxyRegistry;
    }
}

contract OwnableDelegateProxy { }

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}
