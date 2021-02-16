// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;


interface IMetaTxsSupport {

    /**
     * @notice Allows to the the specified spender to spend holder's token amount.
     * Anyone can call, but the parameters must be signed by the holder according to EIP712.
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event
     *
     * @param owner The holder's address
     * @param spender The spender's address
     * @param value The amount allowed to spend
     * @param deadline The (Unix) time at which to expire the signature
     * NOTE: the desired time may differ from the actual one by up to 900 seconds
     * @param v A final byte of signature (ECDSA component)
     * @param r The first 32 bytes of signature (ECDSA component)
     * @param s The second 32 bytes of signature (ECDSA component)
     */
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /**
     * @notice Delegates votes from `delegator` to `delegatee`.
     * Anyone may call, but the parameters must be signed by the delegator according to EIP712.
     * @param delegator The address that delegates votes
     * @param delegatee The address to delegate votes to
     * @param deadline The (Unix) time at which to expire the signature
     * NOTE: the desired time may differ from the actual one by up to 900 seconds
     * @param v A final byte of signature (ECDSA component)
     * @param r The first 32 bytes of signature (ECDSA component)
     * @param s The second 32 bytes of signature (ECDSA component)
     */
    function delegateBySig(
        address delegator,
        address delegatee,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
    external;
}
