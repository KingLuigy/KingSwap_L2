pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IKingERC1155.sol";


contract LootBox is Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint256;

    IKingERC1155 public erc1155;

    uint256 basePrice = 1e18;
    uint256 legendPackPriceMultiplier = 100;
    uint256 rarePackPriceMultiplier = 10;
    uint256 normalPackPriceMultiplier = 3;
    IERC20 public xking;

    address public treasury;

    uint256 internal OVERALL_PROBABILITY = 200000;
    uint256 internal  COMMON_PROBABILITY = 184000;
    uint256 internal  RARE_PROBABILITY = 15400;
    uint256 internal  LEGENDARY_PROBABILITY = 600;

    uint256 constant ONE = 1;

    uint256 internal seed;

    mapping(uint => uint) internal nftProbabilities;

    // Key = Referee Value= Referer
    mapping(address => address) public referrers;

    uint256 public totalNftType = 60;

    constructor(
        address  _treasury,
        IKingERC1155 _erc1155,
        address _erc20
    ) public {
        erc1155 = _erc1155;
        treasury = _treasury;
        xking = IERC20(_erc20);
    }

    /**
     * @dev Main minting logic for lootboxes
     * This is called via safeTransferFrom when MyLootBox extends MyFactory.
     * NOTE: prices and fees are determined by the sell order on OpenSea.
     */
    function openThree(address _referrer
    ) public nonReentrant {
        uint256[] memory ids = _pick3RandomNFT();
        if (
            _referrer != address(0) &&
            _referrer != msg.sender &&
            referrers[msg.sender] == address(0)
        ) {
            // msg.sender has no referer and has entered a referrer name
            referrers[msg.sender] = _referrer;
        }

        uint256 amountToPool = basePrice.mul(normalPackPriceMultiplier);
        address actualReferrer = referrers[msg.sender];

        if (actualReferrer != address(0)) {
            uint256 referrerAward = amountToPool.div(20);
            amountToPool = amountToPool.sub(referrerAward);
            xking.transferFrom(msg.sender, actualReferrer, referrerAward);
        }

        uint256[] memory amounts = new uint256[](3);

        for(uint i = 0 ; i < 3 ; i ++){
            amounts[i] = 1;
        }
        xking.transferFrom(msg.sender, treasury, amountToPool);
        erc1155.mintBatch(msg.sender, ids, amounts, "");
    }

    function openTen(address _referrer ) public nonReentrant {
        uint256[] memory ids = _pick10RandomNFT();

        if (
            _referrer != address(0) &&
            _referrer != msg.sender &&
            referrers[msg.sender] == address(0)
        ) {
            // msg.sender has no referer and has entered a referrer name
            referrers[msg.sender] = _referrer;
        }

        uint256 amountToPool = basePrice.mul(normalPackPriceMultiplier);
        address actualReferrer = referrers[msg.sender];

        if (actualReferrer != address(0)) {
            uint256 referrerAward = amountToPool.div(20);
            amountToPool = amountToPool.sub(referrerAward);
            xking.transferFrom(msg.sender, actualReferrer, referrerAward);
        }

        uint256[] memory amounts = new uint256[](10);

        for(uint i = 0 ; i < 10 ; i ++){
            amounts[i] = 1;
        }
        xking.transferFrom(msg.sender, treasury, amountToPool);
        erc1155.mintBatch(msg.sender, ids, amounts, "");
    }

    function openTwenty(address _referrer) public nonReentrant {
        uint256[] memory ids = _pick20RandomNFT();
        if (
            _referrer != address(0) &&
            _referrer != msg.sender &&
            referrers[msg.sender] == address(0)
        ) {
            // msg.sender has no referer and has entered a referrer name
            referrers[msg.sender] = _referrer;
        }

        uint256 amountToPool = basePrice.mul(normalPackPriceMultiplier);
        address actualReferrer = referrers[msg.sender];

        if (actualReferrer != address(0)) {
            uint256 referrerAward = amountToPool.div(20);
            amountToPool = amountToPool.sub(referrerAward);
            xking.transferFrom(msg.sender, actualReferrer, referrerAward);
        }

        uint256[] memory amounts = new uint256[](20);


        for(uint i = 0 ; i < 20 ; i ++){
            amounts[i] = 1;
        }
        xking.transferFrom(msg.sender, treasury, amountToPool);
        erc1155.mintBatch(msg.sender, ids, amounts, "");
    }

    function _pickGuaranteedCommonNFT() internal returns (uint256) {
        uint256 value = uint256(_random().mod(COMMON_PROBABILITY));

        for (uint256 i = totalNftType-2; i >= 1; i--) {
            uint256 probability = nftProbabilities[i];
            if (value < probability) {
                return i;
            } else {
                value = value - probability;
            }
            i = i - 2;
        }
        return 1;
    }

    function _pickGuaranteedRareNFT() internal returns (uint256) {
        uint256 value = uint256(_random().mod(RARE_PROBABILITY));

        for (uint256 i = totalNftType-1; i >= 2; i--) {
            uint256 probability = nftProbabilities[i];
            if (value < probability) {
                return i;
            } else {
                value = value - probability;
            }
            i = i - 2;
        }
        return 2;
    }

    function _pickGuaranteedLegendaryNFT() internal returns (uint256) {
        uint256 value = uint256(_random().mod(LEGENDARY_PROBABILITY));

        for (uint256 i = totalNftType; i >= 3; i--) {
            uint256 probability = nftProbabilities[i];
            if (value < probability) {
                return i;
            } else {
                value = value - probability;
            }
            i = i - 2;
        }
        return 3;
    }

    function _pickRandomNFT() internal returns (uint256) {
        uint256 value = uint256(_random().mod(OVERALL_PROBABILITY));

        for (uint256 i = totalNftType; i > 0; i--) {
            uint256 probability = nftProbabilities[i];
            if (value < probability) {
                return i;
            } else {
                value = value - probability;
            }
        }
        return 1;
    }

    function _pick3RandomNFT() internal returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](3);
        for(uint256 i = 0 ; i < 3; i++){
            ids[i] = _pickRandomNFT();
        }
        return ids;
    }

    function _pick10RandomNFT() internal returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](10);
        for(uint256 i = 0 ; i < 9; i++){
            ids[i] = _pickRandomNFT();
        }
        ids[9] = _pickGuaranteedRareNFT();
        return ids;
    }

    function _pick20RandomNFT() internal returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](20);
        for(uint256 i = 0 ; i < 19; i++){
            ids[i] = _pickRandomNFT();
        }
        ids[19] = _pickGuaranteedLegendaryNFT();
        return ids;
    }

    function _random() internal returns (uint256) {
        uint256 randomNumber = uint256(
            keccak256(abi.encodePacked(blockhash(block.number - 1), msg.sender, seed))
        );
        seed = randomNumber;
        return randomNumber;
    }

    function setNFTProbability(
        uint256[] memory _ids,
        uint256[] memory _newProbabilities
    ) public onlyOwner {
        require(_ids.length == _newProbabilities.length, "parameter length must be the same");
        for(uint i = 0 ; i < _ids.length; i ++){
            nftProbabilities[_ids[i]] = _newProbabilities[i];
        }
    }

    function setPrice(uint256 _price) public onlyOwner{
        basePrice = _price;
    }

    function setSeed(uint256 _seed) public onlyOwner{
        seed = _seed;
    }

    function setOverallProb(uint256 _prob) public onlyOwner{
        require(_prob > 0, "Prob cannot be less than 0");
        OVERALL_PROBABILITY = _prob;
    }

    function setCommonProb(uint256 _prob) public onlyOwner{
        require(_prob > 0, "Prob cannot be less than 0");
        COMMON_PROBABILITY = _prob;
    }

    function setLegendaryProb(uint256 _prob) public onlyOwner{
        require(_prob > 0, "Prob cannot be less than 0");
        RARE_PROBABILITY = _prob;
    }

    function setRareProb(uint256 _prob) public onlyOwner{
        require(_prob > 0, "Prob cannot be less than 0");
        LEGENDARY_PROBABILITY = _prob;
    }
}
