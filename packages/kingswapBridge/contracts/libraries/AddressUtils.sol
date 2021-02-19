// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Utility functions for the address type
 */
library AddressUtils {
    /**
     * @dev Returns true for a contract with non-zero `extcodesize`
     * (NOTE: it's zero for contracts in construction, destroyed and not-yet deployed contracts)
     * Copied from openzeppelin/contracts/utils/Address.sol
     */
    function isContract(address account) internal view returns (bool) {
        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly { size := extcodesize(account) }
        return size > 0;
    }
}
