pragma solidity >=0.6.0 <0.8.0;

import "./ERC20Mock.sol";

contract ERC677BridgeTokenMock is ERC20Mock {
    address public bridgeContract;

    modifier onlyBridge() {
        require(bridgeContract == msg.sender, "ERC677BridgeTokenMock: unauthorized");
        _;
    }

    constructor(string memory _name, string memory _symbol, uint8 _decimals) ERC20Mock(_name, _symbol, _decimals)
    { }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function setBridgeContract(address _bridgeContract) external onlyOwner {
        bridgeContract = _bridgeContract;
    }

    event Transfer(address indexed from, address indexed to, uint256 value, bytes data);

    bytes4 private constant SELECTOR_ON_TRANSFER = bytes4(keccak256(bytes('onTokenTransfer(address,uint256,bytes)')));

    function transferAndCall(address to, uint256 value, bytes memory data) external returns (bool) {
        _transfer(msg.sender, to, value);
        emit Transfer(msg.sender, to, value, data);

        uint256 size;
        assembly { size := extcodesize(to) } // solhint-disable no-inline-assembly
        if (size > 0) { // isContract
            (bool success, bytes memory _data) = to.call(
                abi.encodeWithSelector(SELECTOR_ON_TRANSFER,msg.sender, value, data)
            );
            require(success && abi.decode(_data, (bool)), 'onTokenTransfer failed');
        }
        return true;
    }

    event _Mint(address indexed to, uint256 amount);
    function mint(address to, uint256 amount) external virtual override onlyBridge {
        require(to != address(0), "mint: zero address minting");
        _mint(to, amount);
        emit _Mint(to, amount);
    }

    function _mockMint(address to, uint256 amount) external {
        require(to != address(0), "mint: zero address minting");
        _mint(to, amount);
    }

    function burn(uint256 amount) external override onlyBridge {
        _burn(msg.sender, amount);
    }
}
