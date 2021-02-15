// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;


interface IERC677Receiver {
    function onTokenTransfer(address from, uint256 value, bytes memory data) external returns (bool);
}
