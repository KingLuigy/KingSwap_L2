pragma solidity >=0.6.0 <0.8.0;

contract Eip1967ProxyMock {
    // EIP-1967 proxy contract storage slots
    bytes32 private constant ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
    bytes32 private constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    constructor(address implementation) {
        address admin = msg.sender;
        bytes32 iSlot = IMPLEMENTATION_SLOT;
        bytes32 aSlot = ADMIN_SLOT;
        assembly {
            sstore(iSlot, implementation)
            sstore(aSlot, admin)
        }
    }

    fallback () external payable {
        address impl;
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            calldatacopy(0, 0, calldatasize())
            impl := sload(slot)
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {
    }
}
