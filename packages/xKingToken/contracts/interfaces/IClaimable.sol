// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;


interface IClaimable {
    /**
     * @dev Withdraws the erc20 tokens or native coins from this contract.
     * @param _token address of the claimed token or address(0) for native coins.
     * @param _to address of the tokens/coins receiver.
     */
    function claimTokens(address _token, address _to) external;
}
