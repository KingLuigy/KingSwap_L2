pragma solidity >=0.6.0 <0.8.0;

import "../interfaces/IUpgradeabilityOwnerStorage.sol";

contract Upgradeable {
    // Avoid using onlyUpgradeabilityOwner name to prevent issues with implementation from proxy contract
    modifier onlyIfUpgradeabilityOwner() {
        require(
            msg.sender == IUpgradeabilityOwnerStorage(address(this)).upgradeabilityOwner(),
            "Upgradable:unauthorized"
        );
        /* solcov ignore next */
        _;
    }

    /**
     * @dev Implements `IUpgradeabilityOwnerStorage` interface for `AdminUpgradeabilityProx` proxy
     * (that is the proxy contract from the openzeppelin/upgrades-core package)
     */
    function upgradeabilityOwner() external view returns (address adm) {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            adm := sload(slot)
        }
    }

    /**
     * @dev Storage slot with the admin of the `AdminUpgradeabilityProx` proxy contract.
     * This is `uint256(keccak256('eip1967.proxy.admin')) - 1` - see the EIP-1967.
     * Note: The slot gets only initialized in the proxy contract' storage,
     * but not in the implementation contract' storage.
     */
    bytes32 internal constant ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
}
