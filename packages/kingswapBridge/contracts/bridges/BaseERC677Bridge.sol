pragma solidity >=0.6.0 <0.8.0;

import "../libraries/AddressUtils.sol";
import "./BasicTokenBridge.sol";
import "../interfaces/IERC677.sol";
import "../interfaces/IERC677Receiver.sol";
import "../upgradeability/ERC677Storage.sol";
import "./ChooseReceiverHelper.sol";


contract BaseERC677Bridge is BasicTokenBridge, IERC677Receiver, ERC677Storage, ChooseReceiverHelper {
    function _erc677token() internal view returns (IERC677) {
        return IERC677(addressStorage[ERC677_TOKEN]);
    }

    function setErc677token(address _token) internal {
        require(AddressUtils.isContract(_token));
        addressStorage[ERC677_TOKEN] = _token;
    }

    function onTokenTransfer(address _from, uint256 _value, bytes _data) external returns (bool) {
        IERC677 token = _erc677token();
        require(msg.sender == address(token));
        require(withinLimit(_value));
        addTotalSpentPerDay(getCurrentDay(), _value);
        bridgeSpecificActionsOnTokenTransfer(token, _from, _value, _data);
        return true;
    }

    /* solcov ignore next */
    function bridgeSpecificActionsOnTokenTransfer(IERC677 _token, address _from, uint256 _value, bytes _data) internal;
}
