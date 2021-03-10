pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./libraries/Signing.sol";


contract RoundTable is ERC20("RoundTable", "xKING"){
    using SafeMath for uint256;
    IERC20 public king;

    string public constant version = "1";

    // EIP712 niceties
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 public constant ENTER_TYPEHASH = keccak256(
        "Enter(address user,uint256 amount,uint256 nonce,uint256 deadline)"
    );
    bytes32 public constant LEAVE_TYPEHASH = keccak256(
        "Leave(address user,uint256 share,uint256 nonce,uint256 deadline)"
    );

    // EIP712 domain
    bytes32 public DOMAIN_SEPARATOR;
    // Mapping from a user address to the nonce for signing/validating signatures
    mapping (address => uint256) public nonces;

    constructor(IERC20 _king) {
        require(address(_king) != address(0), "invalid address");
        king = _king;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(name())),
                keccak256(bytes(version)),
                Signing.getChainId(),
                address(this)
            )
        );
    }

    // Join the table. Pay some $KINGs. Earn some shares.
    function enter(uint256 amount) public {
        _enter(msg.sender, amount);
    }

    function enterBySig(
        address user,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        Signing.checkExpiry(deadline, block.timestamp);
        uint256 nonce = nonces[user]++;
        bytes32 digest;
        {
            bytes memory message = abi.encode(ENTER_TYPEHASH, user, amount, nonce, deadline);
            digest = Signing.eip712Hash(DOMAIN_SEPARATOR, message);
        }
        Signing.verifySignature(user, digest, v, r, s);

        _enter(user, amount);
    }

    function _enter(address user, uint256 amount) internal {
        uint256 totalKing = king.balanceOf(address(this));
        uint256 totalShares = totalSupply();
        if (totalShares == 0 || totalKing == 0) {
            _mint(user, amount);
        } else {
            uint256 what = amount.mul(totalShares).div(totalKing);
            _mint(user, what);
        }
        king.transferFrom(user, address(this), amount);
    }

    // Leave the table. Claim back your $KINGs.
    function leave(uint256 share) public {
        _leave(msg.sender, share);
    }

    function leaveBySig(
        address user,
        uint256 share,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        Signing.checkExpiry(deadline, block.timestamp);
        uint256 nonce = nonces[user]++;
        bytes32 digest;
        {
            bytes memory message = abi.encode(LEAVE_TYPEHASH, user, share, nonce, deadline);
            digest = Signing.eip712Hash(DOMAIN_SEPARATOR, message);
        }
        Signing.verifySignature(user, digest, v, r, s);

        _leave(user, share);
    }

    function _leave(address user, uint256 _share) internal {
        uint256 totalShares = totalSupply();
        uint256 what = _share.mul(king.balanceOf(address(this))).div(totalShares);
        _burn(user, _share);
        king.transfer(user, what);
    }
}
