# AMB extension call flows
_Source (adopted): the ["tokenbridge-contracts" project by "POA network"](https://github.com/poanetwork/tokenbridge-contracts)_

!!! WIP

The call flows below document sequences of contracts methods invocations to cover the main STAKE Arbitrary Message Bridge extension operations.

## Tokens relay: successful path

### Sending ERC20 (ERC677) tokens from Foreign to Home

The scenario to STAKE tokens to another side of the bridge (i.e. lock the tokens on the mediator contract on the originating (Foreign) bridge side).  
Then, the mediator on the terminating (Home) bridge side mints same amount of ERC677 tokens.

#### Request

Either the `RelayTokens` method, for ERC20 compatible tokens, or the `transferAndCall` method, for ERC677 compatible tokens, is used to request the transfer from the Foreign to the Home chain.

```=
ERC677BridgeToken::transferAndCall
..ERC677BridgeToken::_superTransfer
....ERC20::transfer
......ERC20::_transfer
........emit Transfer
..emit Transfer
..ERC677BridgeToken::_contractFallback
>>Mediator
....BasicAMBErc677ToErc677::onTokenTransfer
......ForeignStakeTokenMediator::bridgeSpecificActionsOnTokenTransfer
........TokenBridgeMediator::passMessage
..........TokenBridgeMediator::setMessageHashValue
..........TokenBridgeMediator::setMessageHashRecipient
>>Bridge
..........MessageDelivery::requireToPassMessage
............ForeignAMB::emitEventOnMessageRequest
..............emit UserRequestForAffirmation```

#### Execution

```=
>>Bridge
BasicHomeAMB::executeAffirmation
..BasicHomeAMB::handleMessage
....ArbitraryMessage::unpackData
....MessageProcessor::processMessage
......MessageProcessor::_passMessage
........MessageProcessor::setMessageSender
........MessageProcessor::setTransactionHash
>>Mediator
........TokenBridgeMediator::handleBridgedTokens
..........HomeStakeTokenMediator::executeActionOnBridgedTokens
>>Token
............MintableToken::mint
>>Mediator
............emit TokensBridged
>>Bridge
......MessageProcessor::setMessageCallStatus
......HomeAMB::emitEventOnMessageProcessed
........emit AffirmationCompleted
```

### Sending ERC20 (ERC677) tokens from Home to Foreign

For the scenario to exchange ERC677 tokens on the Home chain back to the ERC20 tokens on the Foreign chain, the mediator contract on the originating (Home) bridge side burns the ERC677 tokens. The mediator of the terminating bridge side unlocks the ERC20 (or ERC677) tokens in favor of the originating request sender.

#### Request

Since the token contract on the Home chain is ERC677 compatible, the `transferAndCall` method is used to request the token transfer.

If it is configured, the fee manager is involved to calculate and distribute fees. The fee distribution happens at the moment of handling the request by the originating (Home) side. It means that fees are collected _BEFORE_ the token exchange completion by the terminating (Foreign) side. The actual fee distribution is delegated to the Block Reward contract by the fee manager -- it will mint the STAKE/xDai tokens and distribute them among the POSDAO consensus stakers. The mediator contract on the terminating side receives the amount of tokens to unlock reduced by amount of fees. 

```=
>>Token
ERC677BridgeToken::transferAndCall
..ERC677BridgeToken::superTransfer
....BasicToken::transfer
......emit Transfer
..emit Transfer
..ERC677BridgeToken::contractFallback
>>Mediator
....BasicAMBErc677ToErc677::onTokenTransfer
......HomeStakeTokenMediator::bridgeSpecificActionsOnTokenTransfer
>>Token
........BurnableToken::burn
..........BurnableToken::_burn
>>Mediator
........TokenBridgeMediator::passMessage
..........TokenBridgeMediator::setMessageHashValue
..........TokenBridgeMediator::setMessageHashRecipient
>>Bridge
..........MessageDelivery::requireToPassMessage
............ForeignAMB::emitEventOnMessageRequest
..............emit UserRequestForSignature
>>BlockReward
........HomeStakeTokenFeeManager::_distributeFee
..........BlockRewardAuRaTokens::addBridgeTokenRewardReceivers
```

#### Execution

As per the nature of the STAKE tokens economic (related how POSDAO stakers receives the reward) it is possible that the amount of the STAKE/xDai tokens is larger than amount of the STAKE tokens locked on the STAKE extension.

That is why the extension has privileges to mint STAKE tokens if it is necessary. But this will happen only in the case when the amount of locked STAKE tokens is less than the value exchanged through the bridge.

The calls flow provided below consider only the case when the balance of the Foreign mediator contract is enough to unlock requested amount of STAKE tokens.

```=
>>Bridge
BasicForeignAMB::executeSignatures
..ArbitraryMessage.unpackData
....MessageProcessor::processMessage
......MessageProcessor::_passMessage
........MessageProcessor::setMessageSender
........MessageProcessor::setTransactionHash
>>Mediator
........TokenBridgeMediator::handleBridgedTokens
..........ForeignStakeTokenMediator::executeActionOnBridgedTokens
............ForeignStakeTokenMediator::_transferWithOptionalMint
>>Token
..............ERC677BridgeToken::transfer
................ERC677BridgeToken::_superTransfer
..................ERC20::transfer
....................ERC20::_transfer
................ERC677BridgeToken::_callAfterTransfer
..................ERC677BridgeToken::_contractFallback
....................<TOKENRECEIVER>::onTokenTransfer
......................<######>
>>Mediator
............emit TokensBridged
>>Bridge
......MessageProcessor::setMessageCallStatus
......ForeignAMB::emitEventOnMessageProcessed
........emit RelayedMessage
```

## Tokens relay: failure and recovery

Failures in the mediator contract at the moment to complete a relay operation could cause imbalance of the extension due to the asynchronous nature of the Arbitrary Message Bridge. Therefore the feature to recover the balance of the STAKE extension is very important for the extension healthiness. 

For the mediator contracts there is a possibility to provide a way how to recover an operation if the data relay request has been failed within the mediator contract on another side.

For the token bridging this means that:
  * if the operation to mint the STAKE/xDai tokens as part of the Foreign->Home request processing was failed it is possible to unlock the STAKE tokens on the Foreign side;
  * if the operation to unlock the STAKE tokens as part of the Home->Foreign request processing was failed it is possible to mint the burnt STAKE/xDai tokens on the Foreign side.

The mediator can get the status of the corresponding relay request from the bridge contract by using the id of this request (originating transaction hash). So, as soon as a user would like to perform recovery, they send a call with the request id to the mediator contract and if the request was failed indeed the mediator originates the recovery message to the mediator on another side. The recovery messages contain the same information as it was used by the tokens relay request, so the terminating mediator checks that such request was registered and executes the actual recovery by using amount of tokens from the request and the request sender.

It is important that the recovery must be performed without the extension admin attendance.

### Failed attempt to relay tokens from Foreign to Home

#### Execution Failure

A failure happens within the message handler on the mediator contract's side when the Home bridge contract passes the message to it.

```=
>>Bridge
BasicHomeAMB::executeAffirmation
..BasicHomeAMB::handleMessage
....ArbitraryMessage::unpackData
....MessageProcessor::processMessage
......MessageProcessor::_passMessage
........MessageProcessor::setMessageSender
........MessageProcessor::setTransactionHash
>>Mediator
........[failed TokenBridgeMediator::handleBridgedTokens]
>>Bridge
......MessageProcessor::setMessageCallStatus
......MessageProcessor::setFailedMessageDataHash
......MessageProcessor::setFailedMessageReceiver
......MessageProcessor::setFailedMessageSender
......HomeAMB::emitEventOnMessageProcessed
........emit AffirmationCompleted
```

#### Recovery initialization

As soon as a user identified a message transfer failure (e.g. the corresponding amount of STAKE/xDai tokens did not appear on the user account balance on the Home chain), they call the `requestFailedMessageFix` method on the Home mediator contract. Anyone is able to call this method by specifying the message id (the originating transaction hash). The method requests the bridge contract whether the corresponding message was failed indeed. That is why the operation is safe to perform by anyone.

```=
>>Mediator
TokenBridgeMediator::requestFailedMessageFix
>>Bridge
..MessageProcessor::messageCallStatus
..MessageProcessor::failedMessageReceiver
..MessageProcessor::failedMessageSender
..MessageProcessor::failedMessageDataHash
..MessageDelivery::requireToPassMessage
....HomeAMB::emitEventOnMessageRequest
......emit UserRequestForSignature
```

#### Recovery completion

The Foreign chain initially originated the request that is why the extension is imbalances - more STAKE tokens are locked on the Foreign side than STAKE/xDai tokens minted on the Home side. Therefore the appeared message to invoke `fixFailedMessage` causes unlocking of STAKE tokens.

```=
>>Bridge
BasicForeignAMB::executeSignatures
..ArbitraryMessage.unpackData
....MessageProcessor::processMessage
......MessageProcessor::_passMessage
........MessageProcessor::setMessageSender
........MessageProcessor::setTransactionHash
>>Mediator
........TokenBridgeMediator::fixFailedMessage
..........TokenBridgeMediator::messageHashRecipient
..........TokenBridgeMediator::messageHashValue
..........ForeignStakeTokenMediator::executeActionOnFixedTokens
............ForeignStakeTokenMediator::_transferWithOptionalMint
>>Token
..............ERC677BridgeToken::transfer
................ERC677BridgeToken::_superTransfer
..................ERC20::transfer
....................ERC20::_transfer
................ERC677BridgeToken::_callAfterTransfer
..................ERC677BridgeToken::_contractFallback
....................<TOKENRECEIVER>::onTokenTransfer
......................<######>
>>Mediator
..........emit FailedMessageFixed
>>Bridge
......MessageProcessor::setMessageCallStatus
......ForeignAMB::emitEventOnMessageProcessed
........emit RelayedMessage
```

### Failed attempt to relay tokens from Home to Foreign

#### Execution Failure

A failure happens within the message handler on the mediator contract's side when the Foreign bridge contract passes the message to it.

```=
>>Bridge
BasicForeignAMB::executeSignatures
..ArbitraryMessage.unpackData
....MessageProcessor::processMessage
......MessageProcessor::_passMessage
........MessageProcessor::setMessageSender
........MessageProcessor::setTransactionHash
>>Mediator
........[failed TokenBridgeMediator::handleBridgedTokens]
>>Bridge
......MessageProcessor::setMessageCallStatus
......MessageProcessor::setFailedMessageDataHash
......MessageProcessor::setFailedMessageReceiver
......MessageProcessor::setFailedMessageSender
......ForeignAMB::emitEventOnMessageProcessed
........emit RelayedMessage
```

#### Recovery initialization

As soon as a user identified a message transfer failure (e.g. the corresponding amount of STAKE tokens did not appear on the user account balance on the Foreign chain), they call the `requestFailedMessageFix` method on the Foreign mediator contract. Anyone is able to call this method by specifying the message id (the originating transaction hash). The method requests the bridge contract whether the corresponding message was failed indeed. That is why the operation is safe to perform by anyone.

```=
>>Mediator
TokenBridgeMediator::requestFailedMessageFix
>>Bridge
..MessageProcessor::messageCallStatus
..MessageProcessor::failedMessageReceiver
..MessageProcessor::failedMessageSender
..MessageProcessor::failedMessageDataHash
..MessageDelivery::requireToPassMessage
....ForeignAMB::emitEventOnMessageRequest
......emit UserRequestForAffirmation
```

#### Recovery completion

The Home chain initially originated the request. It has no STAKE/xDai tokens anymore on the mediator contract balance since they were burnt as part of the request -- the extension is imbalanced. That is why the appeared message to invoke `fixFailedMessage` causes new STAKE/xDai tokens minting.

```=
>>Bridge
BasicHomeAMB::executeAffirmation
..BasicHomeAMB::handleMessage
....ArbitraryMessage::unpackData
....MessageProcessor::processMessage
......MessageProcessor::_passMessage
........MessageProcessor::setMessageSender
........MessageProcessor::setTransactionHash
>>Mediator
........TokenBridgeMediator::fixFailedMessage
..........TokenBridgeMediator::messageHashRecipient
..........TokenBridgeMediator::messageHashValue
..........HomeStakeTokenMediator::executeActionOnFixedTokens
>>Token
............Address::MintableToken::mint
>>Mediator
..........emit FailedMessageFixed
>>Bridge
......MessageProcessor::setMessageCallStatus
......HomeAMB::emitEventOnMessageProcessed
........emit AffirmationCompleted
```

## Tokens relay to an alternative receiver

The scenarios for the feature "Alternative receiver" are considered separately since the call flows of the originating transactions are slightly different.

The idea of the feature is that a user invokes a special method (`relayTokens`) on the mediator contract in order to specify the receiver of the tokens on the another side. So, the tokens will be unlocked/minted in favor of the specified account rather than the request originator as it is assumed by the general approach.

### Change receiver for Foreign to Home relay operation

The `relayTokens` method in the mediator contract on the Foreign side must be executed only after approving the mediator to transfer STAKE tokens. So, the originating action consists of two steps:
  * the user calls `approve` from the STAKE token contract
  * the user calls `relayTokens` from the mediator contract by specifying both the receiver of tokens on another side and the amount of tokens to exchange.

This will allow to the mediator contract to call the `transferFrom` method from the token contract to receive and lock tokens.

#### Request

```=
>>Mediator
BasicAMBErc677ToErc677::relayTokens
>>Token
..ERC677BridgeToken::transferFrom
....ERC677BridgeToken::_superTransferFrom
......ERC20Permittable::transferFrom
........ERC20::_transfer
..........emit Transfer
....ERC677BridgeToken::_callAfterTransfer
......ERC677BridgeToken::_contractFallback
>>Mediator
........BasicAMBErc677ToErc677::onTokenTransfer
..........ForeignStakeTokenMediator::bridgeSpecificActionsOnTokenTransfer
............TokenBridgeMediator::passMessage
..............TokenBridgeMediator::setMessageHashValue
..............TokenBridgeMediator::setMessageHashRecipient
>>Bridge
..............MessageDelivery::requireToPassMessage
................ForeignAMB::emitEventOnMessageRequest
..................emit UserRequestForAffirmation
```

#### Execution

The same as for the general approach

### Change receiver for Home to Foreign relay operation

The mediator on the Home side also provides the `relayTokens` method. Prior to invoke this method, the user must call `approve` from the STAKE/xDai token contract.

#### Request

```=
>>Mediator
BasicAMBErc677ToErc677::relayTokens
>>Token
..ERC677BridgeTokenRewardable::transferFrom
....PermittableToken::transferFrom
......emit Transfer
......ERC677BridgeToken::callAfterTransfer
........ERC677BridgeToken::contractFallback
>>Mediator
..........BasicAMBErc677ToErc677::onTokenTransfer
............HomeStakeTokenMediator::bridgeSpecificActionsOnTokenTransfer
>>Token
..............BurnableToken::burn
................BurnableToken::_burn
>>Mediator
..............TokenBridgeMediator::passMessage
................TokenBridgeMediator::setMessageHashValue
................TokenBridgeMediator::setMessageHashRecipient
>>Bridge
................MessageDelivery::requireToPassMessage
..................ForeignAMB::emitEventOnMessageRequest
....................emit UserRequestForSignature
>>BlockReward
..............HomeStakeTokenFeeManager::_distributeFee
................BlockRewardAuRaTokens::addBridgeTokenRewardReceivers
```

#### Execution

The same as for the general approach
