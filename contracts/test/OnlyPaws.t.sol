// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/OnlyPaws.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OnlyPawsTest is Test {
    OnlyPaws public onlyPaws;
    PawStakingToken public stakingToken;
    IBGT public constant bgt = IBGT(0xbDa130737BDd9618301681329bF2e46A016ff9Ad);

    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);

    uint256 constant INITIAL_BALANCE = 1000 ether;
    uint256 constant PAW_PRICE = 0.1 ether;

    receive() external payable {}

    function setUp() public {
        // Deploy OnlyPaws
        onlyPaws = new OnlyPaws();
        stakingToken = onlyPaws.stakingToken();
        // Fund test accounts
        vm.deal(user1, INITIAL_BALANCE);
        vm.deal(user2, INITIAL_BALANCE);
        vm.deal(user3, INITIAL_BALANCE);
        vm.deal(address(this), INITIAL_BALANCE);

        // Add initial paw images
        vm.startPrank(address(this));
        onlyPaws.addPawImage(1, PAW_PRICE);
        onlyPaws.addPawImage(2, PAW_PRICE);
        onlyPaws.addPawImage(3, PAW_PRICE);
        vm.stopPrank();
    }

    function testPawPurchaseAndStaking() public {
        vm.startPrank(user1);

        // Purchase paw
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);

        // Verify stake
        (uint256 amount, uint256 expiryTime, bool isActive) = onlyPaws
            .pawStakes(user1, 1);
        assertTrue(isActive, "Stake should be active");
        assertEq(amount, onlyPaws.PAW_STAKE_AMOUNT(), "Incorrect stake amount");
        assertEq(
            expiryTime,
            block.timestamp + onlyPaws.REWARD_DURATION(),
            "Incorrect expiry time"
        );

        vm.stopPrank();
    }

    function testRewardDistribution() public {
        // User1 purchases paw
        vm.prank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);

        // Advance time halfway through reward period
        vm.warp(block.timestamp + 3.5 days);

        // User2 purchases paw
        vm.prank(user2);
        onlyPaws.purchasePaw{value: PAW_PRICE}(2);

        // Advance to end of reward period
        vm.warp(block.timestamp + 3.5 days);

        // Harvest rewards
        onlyPaws.harvestRewards();

        // User1 claims rewards
        uint256 user1BalanceBefore = user1.balance;
        vm.prank(user1);
        onlyPaws.claimRewards();
        uint256 user1Rewards = user1.balance - user1BalanceBefore;

        // User2 claims rewards
        uint256 user2BalanceBefore = user2.balance;
        vm.prank(user2);
        onlyPaws.claimRewards();
        uint256 user2Rewards = user2.balance - user2BalanceBefore;

        // Verify rewards
        assertGt(user1Rewards, 0, "User1 should have non-zero rewards");
        assertGt(user2Rewards, 0, "User2 should have non-zero rewards");
        assertGt(
            user1Rewards,
            user2Rewards,
            "User1 should have more rewards than User2"
        );
    }

    function testStakeExpiry() public {
        // User1 purchases paw
        vm.startPrank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);

        // Advance past reward duration
        vm.warp(block.timestamp + onlyPaws.REWARD_DURATION() + 1);

        // Check expired stakes
        onlyPaws.checkExpiredStakes();

        // Verify stake is no longer active
        (, , bool isActive) = onlyPaws.pawStakes(user1, 1);
        assertFalse(isActive, "Stake should be expired");

        vm.stopPrank();
    }

    function testMultipleStakes() public {
        // User1 purchases multiple paws
        vm.startPrank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(2);

        // Verify user share
        uint256 userShare = onlyPaws.calculateUserShare(user1);
        assertEq(
            userShare,
            onlyPaws.PAW_STAKE_AMOUNT() * 2,
            "Incorrect user share"
        );

        vm.stopPrank();
    }

    function testActiveUserTracking() public {
        // User1 purchases paw
        vm.prank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);

        // Verify user is active
        assertTrue(onlyPaws.isActiveUser(user1), "User1 should be active");

        // Advance past reward duration
        vm.warp(block.timestamp + onlyPaws.REWARD_DURATION() + 1);

        // Check expired stakes
        onlyPaws.checkExpiredStakes();

        // Verify user is no longer active
        assertFalse(onlyPaws.isActiveUser(user1), "User1 should be inactive");
    }
}
