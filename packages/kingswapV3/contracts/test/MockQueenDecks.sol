pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "../QueenDecks.sol";


contract MockQueenDecks is QueenDecks {
    uint256[] public __mockArr;

    constructor(address _treasury) QueenDecks(_treasury) { }

    function __amountDueOn(
        Stake memory stake,
        uint256 timestamp
    ) external pure returns (uint256 totalDue, uint256 rewardIncluded)
    {
        return _amountDueOn(stake, timestamp);
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
