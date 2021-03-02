// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "../RoyalDecks.sol";

contract MockRoyalDecks is RoyalDecks {
    UserStakes internal _mockStakes;
    uint256[] public __mockArr;

    constructor(address king) RoyalDecks(king) {
    }

    function __addUserStake(uint256 nftId, Stake memory stake) external {
        _addUserStake(_mockStakes, nftId, stake);
    }

    function __removeUserStake(uint256 nftId) external {
        _removeUserStake(_mockStakes, nftId);
    }

    function __ids() external view returns (uint256[] memory) {
        return _mockStakes.ids;
    }

    function __stake(uint256 nftId) external view returns (Stake memory) {
        return _mockStakes.data[nftId];
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
