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
    function delegateStake(address user, uint256 amount) external;
    function delegateWithdraw(address user, uint256 amount) external;
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

    function burn(address from, uint256 amount) external {
        require(msg.sender == onlyPaws, "Only onlyPaws can burn");
        _burn(from, amount);
    }
}

contract OnlyPaws {
    using SafeERC20 for IERC20;

    IBerachainRewardsVault public immutable vault;
    PawStakingToken public immutable stakingToken;
    IBGT public constant bgt = IBGT(0xbDa130737BDd9618301681329bF2e46A016ff9Ad);

    uint256 public constant REWARD_DURATION = 7 days;
    uint256 public constant PAW_STAKE_AMOUNT = 1e18;

    struct PawImage {
        address owner;
        uint256 price;
        bool isForSale;
    }

    struct PawStake {
        uint256 amount;
        uint256 expiryTime;
        bool isActive;
    }

    mapping(uint256 => PawImage) public pawImages;
    mapping(address => mapping(uint256 => PawStake)) public pawStakes;
    mapping(address => uint256[]) public userPaws;
    mapping(address => bool) public isActiveUser;
    address[] private activeUsers;

    event PawImageAdded(
        uint256 indexed pawId,
        address indexed owner,
        uint256 price
    );
    event PawPurchased(address indexed buyer, uint256 indexed pawId);
    event PawStaked(
        address indexed user,
        uint256 indexed pawId,
        uint256 amount
    );
    event PawUnstaked(
        address indexed user,
        uint256 indexed pawId,
        uint256 amount
    );
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor() {
        address vaultFactory = 0x2B6e40f65D82A0cB98795bC7587a71bfa49fBB2B;

        stakingToken = new PawStakingToken(address(this));
        vault = IBerachainRewardsVault(
            IBerachainRewardsVaultFactory(vaultFactory).createRewardsVault(
                address(stakingToken)
            )
        );
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

        // Create new stake
        PawStake storage stake = pawStakes[msg.sender][pawId];
        require(!stake.isActive, "Paw already staked");

        stake.amount = PAW_STAKE_AMOUNT;
        stake.expiryTime = block.timestamp + REWARD_DURATION;
        stake.isActive = true;

        userPaws[msg.sender].push(pawId);
        addActiveUser(msg.sender);

        // Delegate stake to user
        stakingToken.mint(address(this), PAW_STAKE_AMOUNT);
        stakingToken.approve(address(vault), PAW_STAKE_AMOUNT);
        vault.delegateStake(msg.sender, PAW_STAKE_AMOUNT);

        emit PawPurchased(msg.sender, pawId);
        emit PawStaked(msg.sender, pawId, PAW_STAKE_AMOUNT);
    }

    function harvestRewards() public {
        checkExpiredStakes();
        uint256 bgtReward = vault.getReward(address(this));
        if (bgtReward > 0) {
            bgt.redeem(address(this), bgtReward);
        }
    }

    function claimRewards() external {
        checkExpiredStakes();
        uint256 balance = address(this).balance;
        if (balance > 0) {
            uint256 userShare = calculateUserShare(msg.sender);
            if (userShare > 0) {
                uint256 reward = (balance * userShare) / getTotalActiveStakes();
                if (reward > 0) {
                    (bool success, ) = payable(msg.sender).call{value: reward}(
                        ""
                    );
                    require(success, "Transfer failed");
                    emit RewardsClaimed(msg.sender, reward);
                }
            }
        }
    }

    function calculateUserShare(address user) public view returns (uint256) {
        uint256 activeStakes = 0;
        uint256[] storage pawIds = userPaws[user];

        for (uint256 i = 0; i < pawIds.length; i++) {
            PawStake storage stake = pawStakes[user][pawIds[i]];
            if (stake.isActive && block.timestamp <= stake.expiryTime) {
                activeStakes += stake.amount;
            }
        }
        return activeStakes;
    }

    function getTotalActiveStakes() public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < activeUsers.length; i++) {
            total += calculateUserShare(activeUsers[i]);
        }
        return total;
    }

    function checkExpiredStakes() public {
        for (uint256 i = 0; i < activeUsers.length; i++) {
            address user = activeUsers[i];
            uint256[] storage pawIds = userPaws[user];

            for (uint256 j = 0; j < pawIds.length; j++) {
                PawStake storage stake = pawStakes[user][pawIds[j]];
                if (stake.isActive && block.timestamp > stake.expiryTime) {
                    vault.delegateWithdraw(user, stake.amount);
                    stakingToken.burn(address(this), stake.amount);

                    stake.isActive = false;
                    emit PawUnstaked(user, pawIds[j], stake.amount);
                }
            }

            if (calculateUserShare(user) == 0) {
                removeActiveUser(user);
            }
        }
    }

    function addActiveUser(address user) internal {
        if (!isActiveUser[user]) {
            activeUsers.push(user);
            isActiveUser[user] = true;
        }
    }

    function removeActiveUser(address user) internal {
        if (isActiveUser[user]) {
            for (uint256 i = 0; i < activeUsers.length; i++) {
                if (activeUsers[i] == user) {
                    activeUsers[i] = activeUsers[activeUsers.length - 1];
                    activeUsers.pop();
                    break;
                }
            }
            isActiveUser[user] = false;
        }
    }

    function getActiveUsers() public view returns (address[] memory) {
        return activeUsers;
    }

    receive() external payable {}
}
