pragma solidity >=0.6.0 <0.8.0;

import "./BaseERC677Bridge.sol";
import "./BaseOverdrawManagement.sol";
import "./VersionableBridge.sol";
import "../interfaces/IAMB.sol";
import "../interfaces/IERC677.sol";
import "../mediators/TokenBridgeMediator.sol";
import "../tokens/Claimable.sol";
import "../utils/Ownable.sol";
import "../utils/ReentrancyGuard.sol";
import "../upgradeability/Initializable.sol";
import "../upgradeability/Upgradeable.sol";

/**
* @title BasicAMBErc677ToErc677
* @dev Common functionality for erc677-to-erc677 mediator intended to work on top of AMB bridge.
*/
abstract contract BasicAMBErc677ToErc677 is
    Initializable,
    ReentrancyGuard,
    Upgradeable,
    Claimable,
    VersionableBridge,
    BaseOverdrawManagement,
    BaseERC677Bridge,
    TokenBridgeMediator
{
    function initialize(
        address _bridgeContract, // AMB bridge contract address on "this" network
        address _mediatorContract, // the mediator contract address from the "other" network
        address _erc677token, // ERC20/ERC677 contract on "this" network
        uint256[3] memory _dailyLimitMaxPerTxMinPerTxArray, // [ 0 = _dailyLimit, 1 = _maxPerTx, 2 = _minPerTx ]
        uint256[2] memory _executionDailyLimitExecutionMaxPerTxArray, // [ 0 = _executionDailyLimit, 1 = _executionMaxPerTx ]
        uint256 _requestGasLimit,
        int256 _decimalShift,
        address _owner
    ) public onlyIfUpgradeabilityOwner returns (bool) {
        require(!isInitialized(), "already initialized");

        _setBridgeContract(_bridgeContract);
        _setMediatorContractOnOtherSide(_mediatorContract);
        setErc677token(_erc677token);
        _setLimits(_dailyLimitMaxPerTxMinPerTxArray);
        _setExecutionLimits(_executionDailyLimitExecutionMaxPerTxArray);
        _setRequestGasLimit(_requestGasLimit);
        _setDecimalShift(_decimalShift);
        _setOwner(_owner);
        setInitialize();

        return isInitialized();
    }

    /**
    * @dev Public getter for token contract.
    * @return address of the used token contract
    */
    function erc677token() public view returns (IERC677) {
        return _erc677token();
    }

    function bridgeContractOnOtherSide() internal view override returns (address) {
        return mediatorContractOnOtherSide();
    }

    /**
    * @dev Initiates the bridge operation that will lock the amount of tokens transferred and mint the tokens on
    * the other network. The user should first call Approve method of the ERC677 token.
    * @param _receiver address that will receive the minted tokens on the other network.
    * @param _value amount of tokens to be transferred to the other network.
    */
    function relayTokens(address _receiver, uint256 _value) external virtual {
        // This lock is to prevent calling passMessage twice if a ERC677 token is used.
        // When transferFrom is called, after the transfer, the ERC677 token will call onTokenTransfer from this contract
        // which will call passMessage.
        require(!lock(), "relayTokens: non-reentrant");
        IERC677 token = erc677token();
        address to = address(this);
        require(withinLimit(_value), "relayTokens: over limit");
        addTotalSpentPerDay(getCurrentDay(), _value);

        setLock(true);
        token.transferFrom(msg.sender, to, _value);
        setLock(false);
        bridgeSpecificActionsOnTokenTransfer(token, msg.sender, _value, abi.encodePacked(_receiver));
    }

    function onTokenTransfer(address _from, uint256 _value, bytes memory _data) external override returns (bool) {
        IERC677 token = erc677token();
        require(msg.sender == address(token), "onTokenTransfer: unauthorized");
        if (!lock()) {
            require(withinLimit(_value), "onTokenTransfer: over limit");
            addTotalSpentPerDay(getCurrentDay(), _value);
        }
        bridgeSpecificActionsOnTokenTransfer(token, _from, _value, _data);
        return true;
    }

    function getBridgeInterfacesVersion() external pure override returns (uint64 major, uint64 minor, uint64 patch) {
        return (1, 4, 0);
    }

    function getBridgeMode() external pure override returns (bytes4 _data) {
        return 0x76595b56; // bytes4(keccak256(abi.encodePacked("erc-to-erc-amb")))
    }

    /**
    * @dev Execute the action to be performed when the bridge tokens are out of execution limits.
    * @param _recipient address intended to receive the tokens
    * @param _value amount of tokens to be received
    */
    function executeActionOnBridgedTokensOutOfLimit(address _recipient, uint256 _value) internal override {
        bytes32 _messageId = messageId();
        address recipient;
        uint256 value;
        (recipient, value) = txAboveLimits(_messageId);
        require(recipient == address(0) && value == 0, "execActOnBrTokensOutOfLimit:E1");
        setOutOfLimitAmount(outOfLimitAmount().add(_value));
        setTxAboveLimits(_recipient, _value, _messageId);
        emit MediatorAmountLimitExceeded(_recipient, _value, _messageId);
    }

    /**
    * @dev Fixes locked tokens, that were out of execution limits during the call to handleBridgedTokens
    * @param messageId reference for bridge operation that was out of execution limits
    * @param unlockOnOtherSide true if fixed tokens should be unlocked to the other side of the bridge
    * @param valueToUnlock unlocked amount of tokens, should be less than saved txAboveLimitsValue.
    * Should be less than maxPerTx(), if tokens need to be unlocked on the other side.
    */
    function fixAssetsAboveLimits(bytes32 messageId, bool unlockOnOtherSide, uint256 valueToUnlock)
        external
        override
        onlyIfUpgradeabilityOwner
    {
        (address recipient, uint256 value) = txAboveLimits(messageId);
        require(recipient != address(0) && value > 0 && value >= valueToUnlock, "fixAssetsAboveLimits: bad input");
        setOutOfLimitAmount(outOfLimitAmount().sub(valueToUnlock));
        uint256 pendingValue = value.sub(valueToUnlock);
        setTxAboveLimitsValue(pendingValue, messageId);
        emit AssetAboveLimitsFixed(messageId, valueToUnlock, pendingValue);
        if (unlockOnOtherSide) {
            require(valueToUnlock <= maxPerTx(), "fixAssetsAboveLimits: over limit");
            passMessage(recipient, recipient, valueToUnlock);
        }
    }
}
