pragma solidity >=0.6.0 <0.8.0;

import "../utils/Eip1967Proxied.sol";

contract Upgradeable is Eip1967Proxied {
    modifier onlyIfUpgradeabilityOwner() {
        require(msg.sender == _proxyAdmin(), "Upgradable:unauthorized");
        /* solcov ignore next */
        _;
    }
}
