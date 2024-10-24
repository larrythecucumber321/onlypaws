// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/OnlyPaws.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OnlyPawsTest is Test {
    OnlyPaws public onlyPaws;
    PawStakingToken public stakingToken;
    IBerachainRewardsVault public vault;

    address distributor = 0x2C1F148Ee973a4cdA4aBEce2241DF3D3337b7319;
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);

    uint256 constant INITIAL_BALANCE = 1000 ether;
    uint256 constant PAW_PRICE = 0.1 ether;

    receive() external payable {}

    function setUp() public {
        onlyPaws = new OnlyPaws();
        stakingToken = onlyPaws.stakingToken();
        vault = onlyPaws.vault();

        vm.deal(user1, INITIAL_BALANCE);
        vm.deal(user2, INITIAL_BALANCE);
        vm.deal(user3, INITIAL_BALANCE);
        vm.deal(address(this), INITIAL_BALANCE);

        // Add initial paw images
        vm.startPrank(address(this));
        for (uint256 i = 1; i <= 10; i++) {
            onlyPaws.addPawImage(i, PAW_PRICE);
        }
        vm.stopPrank();
    }

    function testRelativeStakeAmounts() public {
        // User1 purchases two paws
        vm.startPrank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(2);
        vm.stopPrank();

        // User2 purchases one paw
        vm.startPrank(user2);
        onlyPaws.purchasePaw{value: PAW_PRICE}(3);
        vm.stopPrank();

        // Check delegated stakes
        uint256 user1Stake = vault.getDelegateStake(user1, address(onlyPaws));
        uint256 user2Stake = vault.getDelegateStake(user2, address(onlyPaws));

        // User1 should have twice the stake of User2
        assertEq(
            user1Stake,
            user2Stake * 2,
            "User1 should have double the stake of User2"
        );
    }

    function testStakeTimingAndExpiry() public {
        // User1 purchases paw at start
        vm.startPrank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);
        vm.stopPrank();

        // Advance time halfway through period
        vm.warp(block.timestamp + 3.5 days);

        // User2 purchases paw
        vm.startPrank(user2);
        onlyPaws.purchasePaw{value: PAW_PRICE}(2);
        vm.stopPrank();

        uint256 user1Stake = vault.getDelegateStake(user1, address(onlyPaws));
        uint256 user2Stake = vault.getDelegateStake(user2, address(onlyPaws));

        // Both should have equal stakes at this point
        assertEq(
            user1Stake,
            user2Stake,
            "Stakes should be equal during active period"
        );

        // Advance time to expire User1's stake
        vm.warp(block.timestamp + 4 days);

        // User3 purchase will trigger purge of expired stakes
        vm.startPrank(user3);
        onlyPaws.purchasePaw{value: PAW_PRICE}(3);
        vm.stopPrank();

        user1Stake = vault.getDelegateStake(user1, address(onlyPaws));
        user2Stake = vault.getDelegateStake(user2, address(onlyPaws));

        // User1's stake should be 0, User2's stake should remain
        assertEq(user1Stake, 0, "User1's stake should have expired");
        assertEq(
            user2Stake,
            onlyPaws.PAW_STAKE_AMOUNT(),
            "User2's stake should remain active"
        );
    }

    function testChronologicalOrder() public {
        // Create stakes at different times
        vm.startPrank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days);
        vm.startPrank(user2);
        onlyPaws.purchasePaw{value: PAW_PRICE}(2);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days);
        vm.startPrank(user3);
        onlyPaws.purchasePaw{value: PAW_PRICE}(3);
        vm.stopPrank();

        OnlyPaws.StakeInfo[] memory stakes = onlyPaws.getActiveStakes();

        // Verify chronological ordering
        for (uint256 i = 1; i < stakes.length; i++) {
            assertTrue(
                stakes[i].expiryTime > stakes[i - 1].expiryTime,
                "Stakes should be in chronological order"
            );
        }
    }

    function testAutomaticPurgeOnPurchase() public {
        // Create initial stakes
        vm.prank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);

        vm.warp(block.timestamp + 1 days);
        vm.prank(user2);
        onlyPaws.purchasePaw{value: PAW_PRICE}(2);

        // Advance time to expire only first stake
        vm.warp(block.timestamp + onlyPaws.REWARD_DURATION());

        // New purchase should trigger purge of first stake only
        vm.prank(user3);
        onlyPaws.purchasePaw{value: PAW_PRICE}(3);

        OnlyPaws.StakeInfo[] memory activeStakes = onlyPaws.getActiveStakes();

        // Should have user2 and user3's stakes (user1's stake expired)
        assertEq(activeStakes.length, 2, "Should have two active stakes");
        assertFalse(
            activeStakes[0].expiryTime > block.timestamp,
            "First stake should be expired"
        );
        assertTrue(
            activeStakes[1].expiryTime > block.timestamp,
            "Second stake should not be expired"
        );
    }

    function testMultipleExpiredStakesPurge() public {
        // Create multiple stakes
        for (uint256 i = 0; i < 5; i++) {
            address user = address(uint160(i + 1));
            vm.deal(user, PAW_PRICE * 2); // Fund for both initial and later purchase
            vm.startPrank(user);
            onlyPaws.purchasePaw{value: PAW_PRICE}(i + 1);
            vm.stopPrank();
            vm.warp(block.timestamp + 1 days);
        }

        // Advance time to expire all stakes
        vm.warp(block.timestamp + onlyPaws.REWARD_DURATION() + 1);

        // New purchase should purge all expired stakes
        vm.startPrank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(6);
        vm.stopPrank();

        OnlyPaws.StakeInfo[] memory activeStakes = onlyPaws.getActiveStakes();
        assertEq(activeStakes.length, 1, "Should only have the new stake");
        assertEq(
            activeStakes[0].user,
            user1,
            "Only user1's new stake should remain"
        );
    }
}
