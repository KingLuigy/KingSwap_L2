pragma solidity >=0.6.0 <0.8.0;

interface IUpgradeabilityOwnerStorage {
    function upgradeabilityOwner() external view returns (address);
}
