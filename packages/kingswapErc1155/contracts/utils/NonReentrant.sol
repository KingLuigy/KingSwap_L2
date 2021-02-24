// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 * Source: openzeppelin/contracts/utils/ReentrancyGuard.sol
 */
contract NonReentrant {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    function _initNonReentratnt () internal {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "NonReentrant: reentrant call");
        _status = _ENTERED;

        _;

        _status = _NOT_ENTERED;
    }
}
