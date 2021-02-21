pragma solidity >=0.6.0 <0.8.0;

interface IEip1967Proxied {
    function proxyImplementation() external view returns (address);
    function proxyAdmin() external view returns (address);
}

/// @dev Utils for a contract that "runs behind" an EIP1967-compatible proxy
contract Eip1967Proxied is IEip1967Proxied {
    // Proxy contract storage slots for the proxy admin and the implementation contract addresses
    // (calculated as:
    //   uint256(keccak256('eip1967.proxy.admin')) - 1`
    //   uint256(keccak256('eip1967.proxy.admin')) - 1`)
    // These slots get only initialized in the proxy (but not implementation) contract' storage.
    // Refer to "EIP-1967: Standard Proxy Storage Slots"
    bytes32 private constant ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
    bytes32 private constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    /**
     * @dev Returns the address of the proxy admin
     * Note: It's only initialized for the proxy (but not for the "implementation") contract
     */
    function proxyAdmin() external view override returns (address) {
        return _proxyAdmin();
    }

    /**
     * @dev Returns the address of the implementation contract
     * Note: It's only initialized for the proxy (but not for the "implementation") contract
     */
    function proxyImplementation() external view override returns (address impl) {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly { impl := sload(slot) } // solhint-disable no-inline-assembly
    }

    /// @dev Returns true if called on an EIP1967-compatible proxy
    function isEip1967Proxy() public view virtual returns (bool) {
        // Must be "external" call
        return this.proxyImplementation() != address(0);
    }

    function _proxyAdmin() internal view returns (address adm) {
        bytes32 slot = ADMIN_SLOT;
        assembly { adm := sload(slot) } // solhint-disable no-inline-assembly
    }
}
