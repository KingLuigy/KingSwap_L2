// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./Erc20ExtendedToken.sol";
import "../interfaces/IClaimable.sol";
import "../interfaces/IERC677Extension.sol";
import "../interfaces/IERC677Receiver.sol";
import "../interfaces/IMintableBurnable.sol";
import "../libraries/AddressUtils.sol";
import "../utils/Claimable.sol";
import "../utils/NonReentrant.sol";


/**
* @title Erc677BridgeToken
* @dev Bridgeable ERC20/ERC677-compatible token
*/
abstract contract Erc677BridgeToken is
    NonReentrant,
    Erc20ExtendedToken,
    Claimable,
    IERC677Extension,
    IMintableBurnable,
    IClaimable
{

    function _bridgeContract() internal view virtual returns (address);

    modifier onlyBridge() {
        require(_bridgeContract() == _msgSender(), "BridgeToken: unauthorized");
        _;
    }

    function getTokenInterfacesVersion() external pure returns (uint64 major, uint64 minor, uint64 patch) {
        return (2, 4, 0);
    }

    function isBridge(address _address) public view returns (bool) {
        return _address == _bridgeContract();
    }

    function bridgeContract() external view returns (address) {
        return _bridgeContract();
    }

    /// @inheritdoc IERC677Extension
    function transferAndCall(
        address to,
        uint256 value,
        bytes memory data
    ) external virtual override nonReentrant returns (bool) {
        require(transfer(to, value));
        emit Transfer(msg.sender, to, value, data);

        if (_isContract(to)) {
            require(
                IERC677Receiver(to).onTokenTransfer(msg.sender, value, data),
                "ERC677: onTokenTransfer failed"
            );
        }
        return true;
    }

    /// @inheritdoc IMintableBurnable
    function mint(address to, uint256 amount) external virtual override onlyBridge {
        _mint(to, amount);
    }

    /// @inheritdoc IMintableBurnable
    function burn(uint256 amount) external override onlyBridge {
        _burn(_msgSender(), amount);
    }

    /// @inheritdoc IClaimable
    function claimTokens(address token, address to) external override onlyBridge nonReentrant {
        claimValues(token, to);
    }

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override virtual {
        if (isBridge(to)) {
            require(
                IERC677Receiver(to).onTokenTransfer(from, amount, new bytes(0)),
                "BridgeToken: bridge call failed"
            );
        }
        super._afterTokenTransfer(from, to, amount);
    }

    function _isContract(address _address) internal view virtual returns (bool) {
        return  AddressUtils.isContract(_address);
    }
}
