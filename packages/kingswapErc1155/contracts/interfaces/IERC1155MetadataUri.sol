pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Interface of the optional ERC1155MetadataExtension interface, as defined
 * in the https://eips.ethereum.org/EIPS/eip-1155#metadata-extensions[EIP].
 * Source: openzeppelin/contracts/token/ERC1155/IERC1155MetadataURI.sol
 */
interface IERC1155MetadataURI {
    /**
     * @dev Returns the URI for token type `id`.
     * If the `\{id\}` substring is present in the URI, it must be replaced by
     * clients with the actual token type ID.
     */
    function uri(uint256 id) external view returns (string memory);
}
