// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "../KingDecks.sol";

contract MockKingDecks is KingDecks {

    uint256[] public __mockArr;

    constructor (address _treasury) KingDecks(_treasury) {
    }

    function __computeEarlyWithdrawal(
        Deposit memory d,
        TermSheet memory tS,
        uint256 timeNow
    ) external pure returns (
        uint256 amountToUser,
        uint256 fees,
        uint256 newlockedShare
    ) {
        return _computeEarlyWithdrawal(d, tS, timeNow);
    }

    function __isAllowedNftId(
        uint256 nftId,
        uint256 allowedBitMask
    ) external pure returns(bool) {
        return _isAllowedNftId(nftId, allowedBitMask);
    }

    function __encodeDepositId(
        uint256 serialNum,
        uint256 termsId,
        uint256 outTokenId,
        uint256 nfTokenId,
        uint256 nftId
    ) external pure returns(uint256) {
        return _encodeDepositId(serialNum, termsId, outTokenId, nfTokenId, nftId);
    }

    function __decodeDepositId(uint256 depositId) external pure
    returns (
        uint16 termsId,
        uint8 outTokenId,
        uint8 nfTokenId,
        uint16 nftId
    ) {
        return _decodeDepositId(depositId);
    }

    function __amountOut(
        uint256 amount,
        uint64 rate,
        uint8 decIn,
        uint8 decOut
    ) external pure returns(uint256 out) {
        return _amountOut(amount, rate, decIn, decOut);
    }

    function __addArrElements(uint256[] calldata els) external {
        for (uint256 i = 0; i < els.length; i++) {
            __mockArr.push(els[i]);
        }
    }

    function __removeArrayElement(uint256 el) external {
        _removeArrayElement(__mockArr, el);
    }

    function __mockArrLength() external view returns(uint256) {
        return __mockArr.length;
    }
}
