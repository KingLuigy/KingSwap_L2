pragma solidity ^0.7.6;

import "./ERC1155/ERC1155MintBurn.sol";
import "./ERC1155/ERC1155Meta.sol";
import "./interfaces/IERC1155MetadataUri.sol";
import "./libraries/ChainId.sol";
import "./utils/Eip1967Proxied.sol";
import "./utils/NonReentrant.sol";


/**
 * @title XKingERC1155
 * XKingERC1155 - ERC1155 contract with extra functionality:
 * operators, create/mint, uri(), name(), symbol(), totalSupply(), meta-transactions
 * It is supposed to run on the XDAI chain, "behind" the EIP-1967 proxy
 */
contract XKingERC1155 is
    NonReentrant,
    Eip1967Proxied,
    ERC1155MintBurn,
    ERC1155Meta
{
    string private constant _name = "KingSwap Tokens";
    string private constant _symbol = "KingSwap";
    string private constant _uri = "https://thekingswap.github.io/ERC1155/api/token/{id}.json";
    string public constant version = "1";

    uint256 private _currentTokenID;
    mapping (address => bool) public isCreator;

    /**
     * @dev Require msg.sender to be the creator
     */
    modifier creatorsOnly() {
        require(isCreator[msg.sender], "King1155:ONLY_CREATOR_ALLOWED");
        _;
    }

    // @dev Init the proxy contract storage
    function initialize() public virtual {
        require(isEip1967Proxy(), "King1155:MUST_BE_PROXY");
        require(
            msg.sender == IEip1967Proxied(address(this)).proxyAdmin(),
            "King1155:MUST_BE_ADMIN"
        );
        require(DOMAIN_SEPARATOR == bytes32(0), "King1155:ALREADY_INITIALIZED");

        // _currentTokenID = 0;
        _initNonReentratnt();
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(_name)),
                keccak256(bytes(version)),
                ChainId.getChainId(),
                address(this)
            )
        );
    }

    /**
     * @notice Returns the name of the token
     * @dev Data is relevant for the proxy but not for the implementation
     */
    function name() public view returns (string memory) {
        return isEip1967Proxy() ? _name : "";
    }

    /**
     * @notice Returns the symbol of the token
     * @dev Data is relevant for the proxy but not for the implementation
     */
    function symbol() public view returns (string memory) {
        return isEip1967Proxy() ? _symbol : "";
    }

    /**
     * @notice Returns the URI of the token
     * @dev Data is relevant for the proxy but not for the implementation
     */
    function uri() public view returns (string memory) {
        return isEip1967Proxy() ? _uri : "";
    }

    /// @inheritdoc ERC1155PackedBalance
    function balanceOf(address _owner, uint256 _id) public override view returns (uint256)
    {
        return _owner == _supplyHandler ? 0 : super.balanceOf(_owner, _id);
    }

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
    ) external creatorsOnly nonReentrant returns (uint256) {
        requireNonZeroTo(_initialOwner);

        uint256 _id = _getNextTokenID();
        _incrementTokenTypeId(1);

        _mint(_initialOwner, _id, _initialSupply, _data);
        return _id;
    }

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
    ) external creatorsOnly nonReentrant returns (uint256 _firstId, uint256 _lastId)
    {
        requireNonZeroTo(_initialOwner);

        uint256 n = _initialSupplies.length;
        _firstId = _getNextTokenID();
        _lastId = _firstId + n;

        for (uint256 i = 0; i < n; i++) {
            _mint(_initialOwner, _firstId + i, _initialSupplies[i], _data);
        }
        _incrementTokenTypeId(n);
    }

    /**
      * @dev Mints some amount of tokens to an address
      * @param _to      Address of the future owner of the token
      * @param _id      Token ID to mint
      * @param _amount  Amount of tokens to mint
      * @param _data    Data to pass if receiver is contract
      */
    function mint(
        address _to,
        uint256 _id,
        uint256 _amount,
        bytes memory _data
    ) public creatorsOnly nonReentrant {
        require(_id < _getNextTokenID(), "King1155:UNKNOWN_TOKEN_ID");
        requireNonZeroTo(_to);
        _mint(_to, _id, _amount, _data);
    }

    /**
      * @dev Mint tokens for each id in _ids
      * @param _to       The address to mint tokens to
      * @param _ids      Array of ids to mint
      * @param _amounts  Array of amounts of tokens to mint per id
      * @param _data     Data to pass if receiver is contract
      */
    function mintBatch(
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data
    ) public creatorsOnly nonReentrant {
        requireNonZeroTo(_to);
        uint256 nextTokenId = _getNextTokenID();
        for (uint256 i = 0; i < _ids.length; i++) {
            require(_ids[i] < nextTokenId, "King1155:UNKNOWN_TOKEN_ID");
        }
        _mintBatch(_to, _ids, _amounts, _data);
    }

    function burn(
        address _from,
        uint256 _id,
        uint256 _amount
    ) public nonReentrant {
        requireNonZeroFrom(_from);
        requireApprovedOperator(_from, msg.sender);
        _burn(_from, _id, _amount);
    }

    function burnBatch(
        address _from,
        uint256[] memory _ids,
        uint256[] memory _amounts
    ) public nonReentrant {
        requireNonZeroFrom(_from);
        requireApprovedOperator(_from, msg.sender);
        _burnBatch(_from, _ids, _amounts);
    }

    function supportsInterface(bytes4 interfaceId) public pure virtual override returns (bool) {
        return interfaceId == type(IERC1155MetadataURI).interfaceId
        || super.supportsInterface(interfaceId);
    }

    /**
      * @dev Set/unset the given address has the creator role
      * @param _creator Address of the new/former creator
      * @param _isCreator True to set, false to unset
      */
    function setCreator(
        address _creator,
        bool _isCreator
    ) public {
        require(_creator != address(0), "King1155:CREATOR_IS_ZERO_ADDRESS");
        require(msg.sender == this.proxyAdmin(), "King1155:MUST_BE_PROXY_ADMIN");
        isCreator[_creator] = _isCreator;
    }

    /**
      * @dev calculates the next token ID based on value of _currentTokenID
      * @return uint256 for the next token ID
      */
    function _getNextTokenID() private view returns (uint256) {
        return _currentTokenID + 1;
    }

    /**
      * @dev increments the value of _currentTokenID
      */
    function _incrementTokenTypeId(uint256 n) private  {
        _currentTokenID = _currentTokenID + n;
    }
}
