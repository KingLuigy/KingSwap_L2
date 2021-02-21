// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "../interfaces/IERC677Receiver.sol";

contract ERC677ReceiverMock is IERC677Receiver {
    address public from;
    uint256 public value;
    bytes public data;
    uint256 public someVar = 0;

    function onTokenTransfer(address _from, uint256 _value, bytes memory _data) external override returns (bool) {
        from = _from;
        value = _value;
        data = _data;
        (bool success, ) = address(this).call(_data);
        require(success, "ERC677ReceiverMock: low level call failed");
        return true;
    }

    function doSomething(uint256 _value) public {
        someVar = _value;
    }
}
