pragma solidity >=0.6.0 <0.8.0;

import "../tokens/SafeTransfers.sol";

contract SafeTransfersMock {
    function _mockTransfer(address token, address to, uint256 amount) external {
        // function transfer(address token, address to, uint value) internal
        SafeTransfers.transfer(token, to, amount);
    }

    function _mockTransferFrom(address token, address from, address to, uint256 amount) external {
        // function transferFrom(address token, address from, address to, uint value) internal
        SafeTransfers.transferFrom(token, from, to, amount);
    }

    function _mockSendValue(address receiver, uint256 value) external {
        // function sendValue(address receiver, uint256 value) internal
        SafeTransfers.sendValue(receiver, value);
    }
}
