# Production Environment

## Networks
The smart contract runs on the _Ethereum mainnet_ and the _xDAai chain_.

### xDai chain
```
Network Name: xDai
RPC URL: https://rpc.xdaichain.com/
Chain ID: 0x64 (100) 
Symbol: xDai
JSON RPC endpoints:
- https://rpc.xdaichain.com/
- (alternative) https://xdai.poanetwork.dev
- wss://rpc.xdaichain.com/wss
- (alternative) wss://xdai.poanetwork.dev/wss
```

#### UI
1) The official blockchain explorer for the _xDai Chain_ [https://blockscout.com/poa/xdai](https://blockscout.com/poa/xdai)  
2) AnyBlock Analytics Explorer for the _xDai Chain_: [https://explorer.anyblock.tools/ethereum/poa/xdai/](https://explorer.anyblock.tools/ethereum/poa/xdai/)

#### Faucet
xDai Faucet to quickly get .01 xDai [https://blockscout.com/poa/xdai/faucet](https://blockscout.com/poa/xdai/faucet): 

#### Dev Tools
Refer to [xDai docs](https://www.xdaichain.com/for-developers/developer-resources#dapp-management-and-developer-tools).

## Bridge
__Arbitrary Message Bridge (AMB)__ between the _Ethereum mainnet_ and the _xDai chain_ is used.  
The bridge allows cross-chain communications.  
A detailed description of the AMB is available here: [Arbitrary Message Bridge (AMB)](https://docs.tokenbridge.net/amb-bridge/about-amb-bridge).

```
Ethereum Mainnet:
AMB contract: 0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e
Gas limit to call method in the xDai chain: 2000000
Finalization rate: 8 blocks
```

```
xDai chain:
AMB contract: 0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59
Gas limit to call method in the Ethereum Mainnet: 2000000
Finalization rate: 8 blocks
```

### Fees
There are currently no fees for users when bridging between xDai and Ethereum. It may change in the future.

### UI
An AMB transaction status may be seen on the [Live Monitoring app: http://alm-xdai.herokuapp.com/](http://alm-xdai.herokuapp.com/).  
The bridge UI is avaliable at [https://dai-bridge.poa.network/](https://dai-bridge.poa.network/)
