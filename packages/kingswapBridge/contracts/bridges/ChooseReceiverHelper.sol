pragma solidity >=0.6.0 <0.8.0;

import "../libraries/Bytes.sol";

abstract contract ChooseReceiverHelper {
    /**
    * @dev Helper function for alternative receiver feature. Chooses the actual receiver out of sender and passed data.
    * @param _from address of tokens sender.
    * @param _data passed data in the transfer message.
    * @return recipient address of the receiver on the other side.
    */
    function chooseReceiver(address _from, bytes memory _data) internal view returns (address recipient) {
        recipient = _from;
        if (_data.length > 0) {
            require(_data.length == 20, "chooseReceiver: invalid data");
            recipient = Bytes.bytesToAddress(_data);
            require(recipient != address(0), "chooseReceiver: zero recipient");
            require(recipient != bridgeContractOnOtherSide(), "chooseReceiver: bridge recipient");
        }
    }

    /* solcov ignore next */
    function bridgeContractOnOtherSide() internal view virtual returns (address);
}
