pragma solidity >=0.6.0 <0.8.0;

import "./IERC20Minimal.sol";
import "./IERC677Extension.sol";

interface IERC677 is IERC20Minimal, IERC677Extension {
}
