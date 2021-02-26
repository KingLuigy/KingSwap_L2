pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IKingERC1155.sol";

// It exchanges a set of ERC-1155 tokens for an ERC-20 token amount according to term sheets
contract ClaimBounty is Ownable, Pausable {
    using SafeERC20 for IERC20;

    struct BountyTerms {
        // Remaining number of prizes allowed under this term sheet
        // (if set to zero - unavailable; 255 - no limitations applied)
        uint8 availableQty;
        // Amount in ERC20-token units (aka bounty)
        uint248 prize;
        // IDs of ERC-1155 tokens to exchange for the "prize"
        uint16[] tokensIds;
        // Number of ERC-1155 tokens to exchange for the "prize"
        uint16[] tokensAmounts;
    }

    BountyTerms[] internal _bountiesTerms;

    address public treasury;
    IKingERC1155 public erc1155;
    IERC20 public prizeErc20;

    constructor(IKingERC1155 _erc1155, address  _treasury, address _erc20) {
        _revertZeroAddress(_erc1155);
        _revertZeroAddress(_erc20);
        _revertZeroAddress(_treasury);

        erc1155 = _erc1155;
        prizeErc20 = IERC20(_erc20);
        treasury = _treasury;
    }

    function claim(uint256 termsId) public {
        BountyTerms memory bt = bountyTerms(termsId);
        require(bt.availableQty > 0, "No more prizes available");
        erc1155.burnBatch(msg.sender, bt.tokensIds, bt.tokensAmounts);
        prizeErc20.safeTransferFrom(treasury, msg.sender, bt.prize);
        if(bt.availableQty != 255) {
            _bountiesTerms[termsId - 1] = bt.availableQty - 1;
        }
    }

    function bountyTerms(uint256 termsId) public view returns(BountyTerms memory bt) {
        require(
            termsId != 0 && termsId <= _bountiesTerms.length,
            "Unknown termsId"
        );
        bt = _bountiesTerms[termsId - 1];
    }

    function allTermsheets() external view returns(BountyTerms[] memory) {
        return _bountiesTerms;
    }

    function addBountiesTerms(BountyTerms[] memory bountiesTerms) public onlyOwner {
        for (uint256 i = 0; i < bountiesTerms.length; i++) {
            _addBountyTerms(bountiesTerms[i]);
        }
    }

    function setTreasury(address _treasury) public onlyOwner {
        _revertZeroAddress(_treasury);
        treasury = _treasury;
    }

    function _revertZeroAddress(address _address) private pure {
        require(_address != address(0), "ClaimBounty:ZERO_ADDRESS");
    }

    function _addBountyTerms(BountyTerms memory bt) internal {
        require(bt.prize > 0 && bt.prize < 2**248, "Prize cannot be 0 or exceeds 248 bits");
        require(bt.availableQty <= 255, "availableQty must be less 256 ");
        require(bt.tokensIds.length == bt.tokensAmounts.length, "Mismatching arrays lengths");
        require(bt.tokensIds.length <= 256, "Too long token lists");
        require(_isUniqNftTokenIds(bt.tokensIds), "Duplicated Token ID");
        _bountiesTerms.push(bt);
    }

    function _isUniqNftTokenIds(uint16[] memory _ids) internal pure returns(bool) {
        uint8[256] memory map;
        for(uint i = 0 ;  i < _ids.length ; i++) {
            if (map[i] != 0) return false;
            map[i] = 1;
        }
        return true;
    }
}
