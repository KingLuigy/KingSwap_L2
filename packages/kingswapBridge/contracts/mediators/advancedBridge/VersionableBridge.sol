pragma solidity >=0.6.0 <0.8.0;


contract VersionableBridge {
    function getBridgeInterfacesVersion() external pure returns (uint64 major, uint64 minor, uint64 patch) {
        return (5, 2, 0);
    }

    /* solcov ignore next */
    function getBridgeMode() external pure returns (bytes4);
}
