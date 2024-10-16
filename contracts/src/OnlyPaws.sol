pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IBerachainRewardsVault.sol";

contract OnlyPaws is Ownable {
    IBerachainRewardsVault public immutable rewardsVault;
    IERC20 public immutable bgtToken;

    uint256 public constant REWARD_DURATION = 7 days;
    uint256 public constant REWARD_AMOUNT = 100 * 1e18; // 100 BGT tokens

    struct PawImage {
        address owner;
        uint256 price;
        bool isForSale;
    }

    mapping(uint256 => PawImage) public pawImages;
    mapping(address => uint256[]) public userPaws;
    mapping(uint256 => uint256) public pawPurchaseTime;

    event PawImageAdded(
        uint256 indexed pawId,
        address indexed owner,
        uint256 price
    );
    event PawPurchased(address indexed buyer, uint256 indexed pawId);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor(address _rewardsVault, address _bgtToken) {
        rewardsVault = IBerachainRewardsVault(_rewardsVault);
        bgtToken = IERC20(_bgtToken);
    }

    function addPawImage(uint256 pawId, uint256 price) external {
        require(
            pawImages[pawId].owner == address(0),
            "Paw image already exists"
        );
        pawImages[pawId] = PawImage(msg.sender, price, true);
        userPaws[msg.sender].push(pawId);
        emit PawImageAdded(pawId, msg.sender, price);
    }

    function purchasePaw(uint256 pawId) external payable {
        PawImage storage paw = pawImages[pawId];
        require(paw.isForSale, "Paw not for sale");
        require(msg.value == paw.price, "Incorrect payment amount");

        address seller = paw.owner;
        paw.owner = msg.sender;
        paw.isForSale = false;
        userPaws[msg.sender].push(pawId);
        pawPurchaseTime[pawId] = block.timestamp;

        payable(seller).transfer(msg.value);
        emit PawPurchased(msg.sender, pawId);
    }

    function claimRewards() external {
        uint256 totalRewards = 0;

        for (uint256 i = 0; i < userPaws[msg.sender].length; i++) {
            uint256 pawId = userPaws[msg.sender][i];
            uint256 purchaseTime = pawPurchaseTime[pawId];

            if (block.timestamp - purchaseTime <= REWARD_DURATION) {
                totalRewards += REWARD_AMOUNT;
            }
        }

        require(totalRewards > 0, "No rewards to claim");

        rewardsVault.delegateStake(msg.sender, totalRewards);
        emit RewardsClaimed(msg.sender, totalRewards);
    }

    function getUserPaws(
        address user
    ) external view returns (uint256[] memory) {
        return userPaws[user];
    }

    function withdrawFunds() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
