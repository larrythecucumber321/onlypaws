// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IBerachainRewardsVault {
    function delegateStake(address user, uint256 amount) external;
    function delegateWithdraw(address user, uint256 amount) external;
    function getDelegateStake(
        address account,
        address delegate
    ) external view returns (uint256);
}

interface IBerachainRewardsVaultFactory {
    function createRewardsVault(
        address stakingToken
    ) external returns (address);
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

    uint256 public constant REWARD_DURATION = 7 days;
    uint256 public constant PAW_STAKE_AMOUNT = 1e18;

    struct PawImage {
        address owner;
        uint256 price;
        bool isForSale;
    }

    struct StakeInfo {
        address user;
        uint256 pawId;
        uint256 amount;
        uint256 expiryTime;
    }

    mapping(uint256 => PawImage) public pawImages;
    mapping(address => mapping(uint256 => bool)) public userHasPaw;
    mapping(address => uint256) public userTotalStake;

    // Chronologically ordered array of stakes
    StakeInfo[] private orderedStakes;

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

    constructor() {
        stakingToken = new PawStakingToken(address(this));
        vault = IBerachainRewardsVault(
            IBerachainRewardsVaultFactory(
                0x2B6e40f65D82A0cB98795bC7587a71bfa49fBB2B
            ).createRewardsVault(address(stakingToken))
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
        // Clean up expired stakes first
        purgeExpiredStakes();

        PawImage storage paw = pawImages[pawId];
        require(paw.isForSale, "Paw not for sale");
        require(msg.value == paw.price, "Incorrect payment amount");
        require(!userHasPaw[msg.sender][pawId], "Already owns this paw");

        uint256 expiryTime = block.timestamp + REWARD_DURATION;

        // Add new stake to ordered array
        orderedStakes.push(
            StakeInfo({
                user: msg.sender,
                pawId: pawId,
                amount: PAW_STAKE_AMOUNT,
                expiryTime: expiryTime
            })
        );

        userHasPaw[msg.sender][pawId] = true;
        userTotalStake[msg.sender] += PAW_STAKE_AMOUNT;

        // Delegate stake to user
        stakingToken.mint(address(this), PAW_STAKE_AMOUNT);
        stakingToken.approve(address(vault), PAW_STAKE_AMOUNT);
        vault.delegateStake(msg.sender, PAW_STAKE_AMOUNT);

        emit PawPurchased(msg.sender, pawId);
        emit PawStaked(msg.sender, pawId, PAW_STAKE_AMOUNT);
    }

    function purgeExpiredStakes() public {
        uint256 i = 0;
        uint256 currentTime = block.timestamp;

        // Continue until we find a non-expired stake or process all stakes
        while (
            i < orderedStakes.length &&
            orderedStakes[i].expiryTime < currentTime
        ) {
            StakeInfo memory stake = orderedStakes[i];

            // Withdraw stake from vault
            vault.delegateWithdraw(stake.user, stake.amount);
            stakingToken.burn(address(this), stake.amount);

            // Update user state
            userHasPaw[stake.user][stake.pawId] = false;
            userTotalStake[stake.user] -= stake.amount;

            emit PawUnstaked(stake.user, stake.pawId, stake.amount);
            i++;
        }

        // Remove expired stakes from array
        if (i > 0) {
            for (uint256 j = i; j < orderedStakes.length; j++) {
                orderedStakes[j - i] = orderedStakes[j];
            }
            for (uint256 j = 0; j < i; j++) {
                orderedStakes.pop();
            }
        }
    }

    function getActiveStakes() public view returns (StakeInfo[] memory) {
        return orderedStakes;
    }

    function getUserStake(address user) public view returns (uint256) {
        return userTotalStake[user];
    }

    receive() external payable {}
}
