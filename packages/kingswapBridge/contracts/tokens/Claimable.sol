// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "../interfaces/IERC20Minimal.sol";
import "./SafeTransfers.sol";

/**
 * @title Claimable
 * @dev Implementation of the claiming utils for withdrawing accidentally sent tokens.
 */
contract Claimable {

    modifier validAddress(address _to) {
        require(_to != address(0), "Claimable: Zero address");
        /* solcov ignore next */
        _;
    }

    /**
     * @dev Withdraws the erc20 tokens or native coins from this contract.
     * Caller MUST ensure the claimed token is NOT involved in bridge transactions.
     * @param token Address of the claimed token or address(0) for native coins.
     * @param to Address of the tokens/coins receiver.
     */
    function claimValues(address token, address to) internal validAddress(to) {
        if (token == address(0)) {
            claimNativeCoins(to);
        } else {
            claimErc20Tokens(token, to);
        }
    }

    /**
     * @dev Withdraws all native coins from the contract.
     * @param to address of the coins receiver.
     */
    function claimNativeCoins(address to) internal {
        uint256 value = address(this).balance;
        SafeTransfers.sendValue(to, value);
    }

    /**
     * @dev Withdraws all tokens of an ERC20 contract from this contract.
     * @param token Address of the claimed ERC20 token.
     * @param to Address of the tokens receiver.
     */
    function claimErc20Tokens(address token, address to) internal {
        uint256 balance = IERC20Minimal(token).balanceOf(address(this));
        SafeTransfers.transfer(token, to, balance);
    }
}
