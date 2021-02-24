pragma solidity ^0.7.6;

import "../XKingErc1155.sol";


contract XKingERC1155Mock is XKingERC1155 {
    function _simulateEip1967Proxy(address mockProxyAdmin) external {
        // Refer to "EIP-1967: Standard Proxy Storage Slots"
        bytes32 implSlot = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
        bytes32 adminSlot = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
        address implementation = address(this);
        assembly {
            sstore(implSlot, implementation)
            sstore(adminSlot, mockProxyAdmin)
        }
    }
}
