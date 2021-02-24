pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IKingERC1155.sol";


contract ClaimBounty is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    struct BountySheet {
        // Remaining number of deposits allowed under this term sheet
        // (if set to zero, deposits disabled; 255 - no limitations applied)
        uint256 availableQty;
        // ID of the ERC-721 token (contract) to deposit
        // (if set to 0, no ERC-721 token is required to be deposited)
        uint256[] nfTokens;

        uint256[] nftTokensQty;
        // Rate to compute the "repay" amount, scaled by 1e+9 (see (1))
        uint256 prize;
    }


    BountySheet[] internal _bountySheets;

    address public treasury;
    IKingERC1155 public erc1155;
    IERC20 public erc20;

    constructor(
        IKingERC1155 _erc1155,
        address  _treasury,
        address _erc20
    ) public {
        treasury = _treasury;
        erc1155 = _erc1155;
        erc20 = IERC20(_erc20);
    }

    function claim(
        uint256 _bountyId,    // term sheet ID
        uint256[] memory _nftId, // list of NFTid
        uint256[] memory _amount //
    ) public nonReentrant {
        require(_checkNFTId(retrieveBountySheet(_bountyId),_nftId), "NFT list does not meet requirement");
        require(_nftId.length > 0, "List of NFT id cannot be empty");
        bool hasBalance = false;
        BountySheet memory bs = retrieveBountySheet(_bountyId);
        require(bs.availableQty > 0, "no more qty");
        uint bountAmt = bs.prize;
        for(uint i = 0 ; i < _nftId.length ; i ++) {
            hasBalance = _checkUserHasBalance(_nftId[i],_amount[i]);
        }
        require(hasBalance, "Does not have required NFT to claim bounty");
        erc1155.burnBatch(msg.sender, _nftId, _amount);
        erc20.safeTransferFrom(treasury, msg.sender, bountAmt);
        bs.availableQty = bs.availableQty.sub(1);
    }

    function _checkNFTId(BountySheet memory bs, uint256[] memory _nftId) internal returns(bool) {
        uint256[] memory nfTokenIds = bs.nfTokens;
        uint256 count = 0;
        for(uint i = 0 ; i < nfTokenIds.length ; i++) {
            for(uint j = 0 ; j < _nftId.length ; j++) {
                if (nfTokenIds[i] == _nftId[j]) {
                    count++;
                }
            }
        }
        if (count == nfTokenIds.length) {
            return true;
        } else{
            return false;
        }
    }

    function retrieveBountySheet(uint256 bountyId) public returns(BountySheet memory) {
        bountyId = _validBountyID(bountyId);
        BountySheet memory bs = _bountySheets[bountyId-1];
        return bs;
    }

    function _validBountyID(uint256 bountyId) internal view returns (uint256) {
        require(
            bountyId != 0 && bountyId <= _bountySheets.length,
            "INVALID_BOUNTY_ID"
        );
        return bountyId;
    }

    function _checkUserHasBalance(uint256 _nftId, uint256 _amount) internal view returns(bool) {
        if (erc1155.balanceOf(msg.sender, _nftId) >= _amount) {
            return true;
        } else{
            return false;
        }
    }

    function setTreasury(address _treasury) public onlyOwner {
        _setTreasury(_treasury);
    }

    function _setTreasury(address _treasury) internal {
        _revertZeroAddress(_treasury);
        treasury = _treasury;
    }

    function _revertZeroAddress(address _address) private pure {
        require(_address != address(0), "KDecks:ZERO_ADDRESS");
    }

    function addBounty(BountySheet[] memory bountySheets) public onlyOwner {
        for (uint256 i = 0; i < bountySheets.length; i++) {
            _addBountySheet(bountySheets[i]);
        }
    }

    function _addBountySheet(BountySheet memory bS) internal {
        require(bS.prize > 0, "Prize cannot be 0");
        require(bS.nfTokens.length == bS.nftTokensQty.length);
        require(_checkSameNFTIdInBounty(bS.nfTokens), "NFT Token cannot be same ID");
        _bountySheets.push(bS);

    }

    function allBountySheets() external view returns(BountySheet[] memory) {
        return _bountySheets;
    }

    function _checkSameNFTIdInBounty(uint256[] memory _ids) internal returns(bool) {
        for(uint i = 0 ;  i < _ids.length ; i++) {
            for(uint j = i+1 ; j < _ids.length ; j++) {
                if (_ids[i] == _ids[j]) {
                    return false;
                }
            }
        }
        return true;
    }
}
