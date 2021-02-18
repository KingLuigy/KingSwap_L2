// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;


interface IBurnableMintableErc20Extension {

    /// @dev Creates `amount` token to `to` account
    function mint(address to, uint256 amount) external;

    /// @dev Destroys `amount` tokens from the caller
    function burn(uint256 amount) external;
}
