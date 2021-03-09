pragma solidity >=0.6.0 <0.8.0;

import "./MockERC20.sol";

contract MockERC677Token is MockERC20 {

    constructor(uint _totalSupply) MockERC20(_totalSupply) { }

    event Transfer(address indexed from, address indexed to, uint256 value, bytes data);

    bytes4 private constant SELECTOR_ON_TRANSFER = bytes4(keccak256(bytes('onTokenTransfer(address,uint256,bytes)')));

    function transferAndCall(address to, uint256 value, bytes memory data) external returns (bool) {
        transfer(to, value);
        emit Transfer(msg.sender, to, value, data);

        uint256 size;
        assembly { size := extcodesize(to) } // solhint-disable no-inline-assembly
        if (size > 0) { // isContract
            (bool success, bytes memory _data) = to.call(
                abi.encodeWithSelector(SELECTOR_ON_TRANSFER,msg.sender, value, data)
            );
            require(success && abi.decode(_data, (bool)), 'onTokenTransfer failed');
        }
        return true;
    }
}
