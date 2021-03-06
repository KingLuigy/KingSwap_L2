// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.8.0;

import "../KingSwapERC20.sol";

contract MockKingSwapERC20 is KingSwapERC20 {
    function _mockMint(address to, uint value) external {
        _mint(to, value);
    }
}
