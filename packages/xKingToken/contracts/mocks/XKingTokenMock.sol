// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "../XKingToken.sol";

// mock class using XKingToken
contract XKingTokenMock is XKingToken {

    function isEip1967Proxy() public view override returns (bool) {
        this;
        return true; // To be used w/o the proxy
    }

    function _mintMock(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function _burnMock(address account, uint256 amount) public {
        _burn(account, amount);
    }

    function transferInternal(address from, address to, uint256 value) public {
        _transfer(from, to, value);
    }

    function approveInternal(address owner, address spender, uint256 value) public {
        _approve(owner, spender, value);
    }
}
