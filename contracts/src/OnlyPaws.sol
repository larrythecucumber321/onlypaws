// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "forge-std/console.sol";

interface IBGT is IERC20 {
    function redeem(address receiver, uint256 amount) external;
}

interface IBerachainRewardsVaultFactory {
    function createRewardsVault(
        address stakingToken
    ) external returns (address);
}

interface IBerachainRewardsVault {
    function stake(uint256 amount) external;
    function getReward(address account) external returns (uint256);
}

contract PawStakingToken is ERC20 {
    address public immutable onlyPaws;

    constructor(address _onlyPaws) ERC20("Paw Staking Token", "PST") {
        onlyPaws = _onlyPaws;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == onlyPaws, "Only onlyPaws can mint");
        _mint(to, amount);
    }
}

contract OnlyPaws {
    using SafeERC20 for IERC20;

    IBerachainRewardsVault public immutable vault;
    PawStakingToken public immutable stakingToken;
    IBGT public constant bgt = IBGT(0xbDa130737BDd9618301681329bF2e46A016ff9Ad);

    uint256 public constant REWARD_DURATION = 7 days;
    uint256 public constant REWARD_PRECISION = 1e18;

    struct PawImage {
        address owner;
        uint256 price;
        bool isForSale;
    }

    struct UserStake {
        uint256 amount;
        uint256 timestamp;
    }

    mapping(uint256 => PawImage) public pawImages;
    mapping(address => uint256[]) public userPaws;
    mapping(address => mapping(uint256 => UserStake)) public userStakes;
    mapping(uint256 => uint256) public pawLastPurchaseTime;

    uint256 public totalSupply;
    uint256 public lastUpdateTime;
    uint256 public rewardRate;
    uint256 public rewardPerTokenStored;
    uint256 public finishAt;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event PawImageAdded(
        uint256 indexed pawId,
        address indexed owner,
        uint256 price
    );
    event PawPurchased(address indexed buyer, uint256 indexed pawId);
    event RewardsDistributed(uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor() {
        stakingToken = new PawStakingToken(address(this));
        IBerachainRewardsVaultFactory factory = IBerachainRewardsVaultFactory(
            0x2B6e40f65D82A0cB98795bC7587a71bfa49fBB2B
        );
        vault = IBerachainRewardsVault(
            factory.createRewardsVault(address(stakingToken))
        );
        stakingToken.mint(address(this), 1e18);
        stakingToken.approve(address(vault), 1e18);
        vault.stake(1e18);
    }

    function addPawImage(uint256 pawId, uint256 price) external {
        require(pawImages[pawId].owner == address(0), "Paw already exists");
        pawImages[pawId] = PawImage({
            owner: msg.sender,
            price: price,
            isForSale: true
        });
        emit PawImageAdded(pawId, msg.sender, price);
    }

    function purchasePaw(uint256 pawId) external payable {
        PawImage storage paw = pawImages[pawId];
        require(paw.isForSale, "Paw not for sale");
        require(msg.value == paw.price, "Incorrect payment amount");

        address payable seller = payable(paw.owner);
        paw.owner = msg.sender;
        paw.isForSale = false;
        userPaws[msg.sender].push(pawId);

        updateReward(msg.sender);
        totalSupply++;
        pawLastPurchaseTime[pawId] = block.timestamp;
        userStakes[msg.sender][pawId] = UserStake({
            amount: 1,
            timestamp: block.timestamp
        });

        (bool success, ) = seller.call{value: paw.price}("");
        require(success, "BERA transfer failed");
        emit PawPurchased(msg.sender, pawId);
    }

    function harvestRewards() public {
        uint256 bgtReward = vault.getReward(address(this));
        console.log("BGT Reward received:", bgtReward);
        console.log(
            "Contract BGT balance before redeem:",
            bgt.balanceOf(address(this))
        );
        if (bgtReward > 0) {
            bgt.redeem(address(this), bgtReward);
            uint256 nativeReward = address(this).balance;
            console.log("Native reward after redeem:", nativeReward);
            notifyRewardAmount(nativeReward);
        }
        console.log(
            "Contract BGT balance after redeem:",
            bgt.balanceOf(address(this))
        );
    }

    function notifyRewardAmount(uint256 reward) internal {
        console.log("Notifying reward amount:", reward);
        if (block.timestamp >= finishAt) {
            rewardRate = reward / REWARD_DURATION;
        } else {
            uint256 remainingRewards = (finishAt - block.timestamp) *
                rewardRate;
            rewardRate = (reward + remainingRewards) / REWARD_DURATION;
        }
        lastUpdateTime = block.timestamp;
        finishAt = block.timestamp + REWARD_DURATION;
        console.log("New reward rate:", rewardRate);
        console.log("New finish time:", finishAt);
        emit RewardsDistributed(reward);
    }

    function updateExpiredStakes(address account) internal {
        uint256[] storage pawIds = userPaws[account];
        for (uint256 i = 0; i < pawIds.length; i++) {
            uint256 pawId = pawIds[i];
            UserStake storage stake = userStakes[account][pawId];
            if (
                stake.amount > 0 &&
                block.timestamp > stake.timestamp + REWARD_DURATION
            ) {
                totalSupply--;
                stake.amount = 0;
            }
        }
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return _min(finishAt, block.timestamp);
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored +
            (rewardRate *
                (lastTimeRewardApplicable() - lastUpdateTime) *
                REWARD_PRECISION) /
            totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        uint256 activeStakes = 0;
        uint256[] storage pawIds = userPaws[account];
        for (uint256 i = 0; i < pawIds.length; i++) {
            UserStake storage stake = userStakes[account][pawIds[i]];
            if (
                stake.amount > 0 &&
                block.timestamp <= stake.timestamp + REWARD_DURATION
            ) {
                activeStakes++;
            }
        }
        return
            ((activeStakes *
                (rewardPerToken() - userRewardPerTokenPaid[account])) /
                REWARD_PRECISION) + rewards[account];
    }

    function claimRewards() external {
        harvestRewards();
        updateReward(msg.sender);
        uint256 reward = rewards[msg.sender];
        console.log("Pending rewards to claim:", reward);
        if (reward > 0) {
            rewards[msg.sender] = 0;
            (bool success, ) = payable(msg.sender).call{value: reward}("");
            require(success, "BERA transfer failed");
            emit RewardsClaimed(msg.sender, reward);
        }
    }

    function updateReward(address account) internal {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();

        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
            updateExpiredStakes(account);
        }
    }

    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x <= y ? x : y;
    }

    receive() external payable {}
}
