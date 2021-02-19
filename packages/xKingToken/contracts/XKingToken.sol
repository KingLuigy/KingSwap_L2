// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./interfaces/IMetaTxsSupport.sol";
import "./libraries/Signing.sol";
import "./NetworkParams.sol";
import "./tokens/Erc677BridgeToken.sol";
import "./tokens/governance/DelegatableCheckpoints.sol";
import "./utils/Eip1967Proxied.sol";


/**
 * @title XKingToken
 * @notice ERC-20 token extended with minting, burning and governance
 */
contract XKingToken is Eip1967Proxied, Erc677BridgeToken, DelegatableCheckpoints, NetworkParams, IMetaTxsSupport {

    string public constant version = "1";

    /// @dev The symbol of the token
    string private constant _symbol = "x$KING";

    /// @dev The name of the token
    string private constant _name = "x$KING Token";

    /// @notice The number of decimals used to get its user representation
    uint8 public constant decimals = 18;

    // EIP712 niceties
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 public constant DELEGATION_TYPEHASH = keccak256(
        "Delegation(address delegator,address delegatee,uint256 nonce,uint256 deadline)"
    );
    bytes32 public constant PERMIT_TYPEHASH = keccak256(
        "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
    );

    // Slot skipped for prev version' storage compatibility
    uint256 private  _gap;

    /// @notice EIP712 Domain separator
    bytes32 public DOMAIN_SEPARATOR;

    /// @notice Mapping from a user address to the nonce for signing/validating signatures
    mapping (address => uint) public nonces;

    // @dev Init the proxy contract storage
    function initialize() public {
        require(isEip1967Proxy(), "xKingToken:MUST_BE_PROXY");
        require(
            msg.sender == IEip1967Proxied(address(this)).proxyAdmin(),
            "xKingToken:MUST_BE_ADMIN"
        );
        require(DOMAIN_SEPARATOR == bytes32(0), "xKingToken:ALREADY_INITIALIZED");

        _initNonReentratnt();
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(_name)),
                keccak256(bytes(version)),
                Signing.getChainId(),
                address(this)
            )
        );
    }

    /// @notice Returns the name of the token
    /// @dev Data is relevant for the proxy but not for the implementation
    function name() public view returns (string memory) {
        return isEip1967Proxy() ? _name : "";
    }

    /// @notice Returns the symbol of the token
    /// @dev Data is relevant for the proxy but not for the implementation
    function symbol() public view returns (string memory) {
        this; // silence mutability warning (w/o extra bytecode)
        return isEip1967Proxy() ? _symbol : "";
    }

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        _checkExpiry(deadline);
        bytes memory message = abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline);
        bytes32 digest = Signing.eip712Hash(DOMAIN_SEPARATOR, message);
        Signing.verifySignature(owner, digest, v, r, s);

        _approve(owner, spender, value);
    }

    function delegateBySig(
        address delegator,
        address delegatee,
        uint deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external  override {
        _checkExpiry(deadline);
        bytes32 digest = Signing.eip712Hash(
            DOMAIN_SEPARATOR,
            abi.encode(DELEGATION_TYPEHASH, delegator, delegatee, nonces[delegator]++, deadline)
        );
        Signing.verifySignature(delegator, digest, v, r, s);

        return _delegate(delegator, delegatee);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        _moveDelegates(from, to, amount);
    }

    function _votesOf(address account) internal view override returns (uint256) {
        return balanceOf(account);
    }

    function _bridgeContract() internal view override virtual returns (address) {
        this; // silence mutability warning (w/o extra bytecode)
        return xAmbErc20ExtAddress;
    }

    function _checkExpiry(uint256 deadline) private view {
        require(now <= deadline, "XKingToken: signature expired");
    }
}
