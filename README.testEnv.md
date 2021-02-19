# Test Environment

## Test networks
The _Kovan Testnet_ simulates the _Ethereum mainnet_, while the _POA Sokol Testnet_ simulates the _xDAai chain_.

### POA Sokol Testnet
```
Network Name: Sokol Testnet
RPC URL:
https://sokol.poa.network
wss://sokol.poa.network/wss 
ChainID: 77
Symbol: SPOA
Block Explorer URL: https://blockscout.com/poa/sokol
SPOA Faucet: https://faucet.poa.network/ 
```

## Bridge
__Arbitrary Message Bridge (AMB)__ between the _Kovan Testnet_ and the _POA Sokol Testnet_ is used.   
The bridge allows testing cross-chain functionality.  
Further explanations:  
[About the kovan-sokol AMB](https://github.com/tokenbridge/docs/blob/master/kovan-sokol-amb-bridge/about-the-kovan-sokol-amb.md)  
[Arbitrary Message Bridge (AMB)](https://docs.tokenbridge.net/amb-bridge/about-amb-bridge).
```
Kovan Testnet:
AMB contract: 0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560
Gas limit to call method in the POA Network: 2000000
Fee: 0.05 Gas Tokens
Finalization rate: 1 blocks
```
```
Sokol Testnet:
AMB contract: 0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560
Gas limit to call method in the Ethereum Mainnet: 2000000
Fee: none
Finalization rate: 1 block
```

### Fees
Charged in Gas Tokens on the _Kovan Testnet_.

### UI
An AMB transaction status may be seen on the [Live Monitoring app](https://alm-test-amb.herokuapp.com/).  
_Sokol Testnet_ block Explorer: [https://blockscout.com/poa/sokol](https://blockscout.com/poa/sokol).  
_Sokol Testnet_ SPOA faucet: [https://faucet.poa.network/](https://faucet.poa.network/).
