// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;


interface IERC677Extension {

    function transferAndCall(address to, uint256 value, bytes memory data) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value, bytes data);
}
