// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;


/**
 * @title SafeTransfers
 * @dev Helper methods to transfer/send safely ERC-20 and native token.
 */
library SafeTransfers {

    bytes4 private constant SELECTOR_TRANSFER = bytes4(keccak256(bytes('transfer(address,uint256)')));
    bytes4 private constant SELECTOR_TRANSFROM = bytes4(keccak256(bytes('transfer(address,address,uint256)')));

    /// @dev Same as ERC20.transfer(address,uint256) but with the returned value check
    function transfer(address token, address to, uint value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR_TRANSFER, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'SafeTransfers: TRANSFER_FAILED');
    }

    /// @dev Same as ERC20.transferFrom(address,address,uint256) but with the returned value check
    function transferFrom(address token, address from, address to, uint value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR_TRANSFROM, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'SafeTransfers: TRANSFER_FAILED');
    }

    function sendValue(address receiver, uint256 value) internal {
        if (!payable(receiver).send(value)) {
            (new Sacrifice){value: value}(receiver);
        }
    }
}

contract Sacrifice {
    constructor(address recipient) public payable {
        selfdestruct(payable(recipient));
    }
}
