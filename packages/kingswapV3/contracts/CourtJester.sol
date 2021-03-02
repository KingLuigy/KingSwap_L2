pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IKingSwapERC20.sol";
import "./interfaces/IKingSwapPair.sol";
import "./interfaces/IKingSwapFactory.sol";

contract CourtJester {
    using SafeMath for uint;

    IKingSwapFactory public factory;
    address public king;
    address public uni;
    address public owner;

    constructor(IKingSwapFactory _factory, address _king, address _uni) {
        require(address(_factory) != address(0) && _king != address(0) &&
            _uni != address(0), "invalid address");
        factory = _factory;
        king = _king;
        uni = _uni;
        owner = msg.sender;
    }

    function convert() public {
        // At least we try to make front-running harder to do.
        require(msg.sender == tx.origin, "do not convert from contract");
        IKingSwapPair pair = IKingSwapPair(factory.getPair(king, uni));
        uint uniBalance = IERC20(uni).balanceOf(address(this));
        IERC20(uni).transfer(address(pair), uniBalance);
        _toKING(uniBalance, address(1));
    }

    function _toKING(uint amountIn, address to) internal {
        IKingSwapPair pair = IKingSwapPair(factory.getPair(king, uni));
        (uint reserve0, uint reserve1,) = pair.getReserves();
        address token0 = pair.token0();
        (uint reserveIn, uint reserveOut) = token0 == uni ? (reserve0, reserve1) : (reserve1, reserve0);
        // avoid stack too deep error
        uint amountOut;
        {
            uint amountInWithFee = amountIn.mul(9975);
            uint numerator = amountInWithFee.mul(reserveOut);
            uint denominator = reserveIn.mul(10000).add(amountInWithFee);
            amountOut = numerator / denominator;
        }
        (uint amount0Out, uint amount1Out) = token0 == uni ? (uint(0), amountOut) : (amountOut, uint(0));
        pair.swap(amount0Out, amount1Out, to, new bytes(0));
    }

    function setFactory(IKingSwapFactory _factory) public {
        require(msg.sender == owner, "only owner");
        factory = _factory;
    }
}
