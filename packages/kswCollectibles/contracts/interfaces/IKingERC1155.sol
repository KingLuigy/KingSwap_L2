// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";


interface IKingERC1155 is IERC1155 {

    /**
     * @dev Mint _amount of tokens of a given id if not frozen and if max supply not exceeded
     * @param _to     The address to mint tokens to.
     * @param _id     Token id to mint
     * @param _amount The amount to be minted
     * @param _data   Byte array of data to pass to recipient if it's a contract
     */
    function mint(address _to, uint256 _id, uint256 _amount, bytes calldata _data) external;

    /**
     * @dev Mint tokens for each ids in _ids
     * @param _to      The address to mint tokens to.
     * @param _ids     Array of ids to mint
     * @param _amounts Array of amount of tokens to mint per id
     * @param _data    Byte array of data to pass to recipient if it's a contract
     */
    function mintBatch(address _to, uint256[] calldata _ids, uint256[] calldata _amounts, bytes calldata _data) external;

    /**
     * @notice Burn _amount of tokens of a given token id
     * @param _from    The address to burn tokens from
     * @param _id      Token id to burn
     * @param _amount  The amount to be burned
     */
    function burn(address _from, uint256 _id, uint256 _amount) external;

    /**
     * @notice Burn tokens of given token id for each (_ids[i], _amounts[i]) pair
     * @param _from     The address to burn tokens from
     * @param _ids      Array of token ids to burn
     * @param _amounts  Array of the amount to be burned
     */
    function burnBatch(address _from, uint256[] calldata _ids, uint256[] calldata _amounts) external;

    /**
      * @dev Creates a new token type
      * @param _initialOwner address of the first owner of the token
      * @param _initialSupply amount to supply the first owner
      * @param _data Data to pass if receiver is contract
      * @return The newly created token ID
      */
    function create(
        address _initialOwner,
        uint256 _initialSupply,
        bytes calldata _data
    ) external returns (uint256);

    /**
      * @dev Creates a new token types
      * @param _initialOwner address of the first owner of the token
      * @param _initialSupplies amounts for every token type to supply the first owner
      * @param _data Data to pass if receiver is contract
      * @return _firstId The ID of the first newly created token type
      * @return _lastId The ID of the last newly created token type
      */
    function createBatch(
        address _initialOwner,
        uint256[] memory _initialSupplies,
        bytes calldata _data
    ) external returns (uint256 _firstId, uint256 _lastId);
}
