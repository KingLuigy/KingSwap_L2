// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./tokens/Erc677BridgeToken.sol";
import "./tokens/governance/DelegatableCheckpoints.sol";
import "./interfaces/IMetaTxsSupport.sol";
import "./libraries/Signing.sol";


/***
 * @title XKingToken
 * @notice ERC-20 token extended with minting, burning and governance
 */
contract XKingToken is Erc677BridgeToken, DelegatableCheckpoints, IMetaTxsSupport {

    string public constant version = "1";

    /// @notice The symbol of the token
    string public constant symbol = "x$KING";

    /// @notice The name of the token
    string public constant name = "x$KING Token";

    /// @notice The number of decimals used to get its user representation
    uint8 public constant decimals = 18;

    // Address of the bridge (mediator) contract
    address private constant _bridge = 0x394c89B29B7b9735947d1e65eEF51B5F53FEc416;

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

    /// @notice EIP712 Domain separator
    bytes32 public DOMAIN_SEPARATOR;

    /// @notice Mapping from a user address to the nonce for signing/validating signatures
    mapping (address => uint) public nonces;

    constructor() public {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                Signing.getChainId(),
                address(this)
            )
        );
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

    function _bridgeContract() internal view override returns (address) {
        this; // silence state mutability warning without generating bytecode
        return _bridge;
    }

    function _checkExpiry(uint256 deadline) private view {
        require(now <= deadline, "XKingToken: signature expired");
    }
}
