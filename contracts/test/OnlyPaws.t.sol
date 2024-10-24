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

        vm.startPrank(address(this));
        onlyPaws.addPawImage(1, PAW_PRICE);
        onlyPaws.addPawImage(2, PAW_PRICE);
        onlyPaws.addPawImage(3, PAW_PRICE);
        vm.stopPrank();
    }

    function testRelativeStakeAmounts() public {
        // User1 purchases two paws
        vm.startPrank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(2);
        vm.stopPrank();

        // User2 purchases one paw
        vm.prank(user2);
        onlyPaws.purchasePaw{value: PAW_PRICE}(3);

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
        vm.prank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);

        // Advance time halfway through period
        vm.warp(block.timestamp + 3.5 days);

        // User2 purchases paw
        vm.prank(user2);
        onlyPaws.purchasePaw{value: PAW_PRICE}(2);

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
        onlyPaws.checkExpiredStakes();

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

    function testPawPurchaseAndStaking() public {
        vm.startPrank(user1);
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

        // Verify delegation
        uint256 delegatedStake = vault.getDelegateStake(
            user1,
            address(onlyPaws)
        );
        assertEq(
            delegatedStake,
            onlyPaws.PAW_STAKE_AMOUNT(),
            "Incorrect delegated stake amount"
        );

        vm.stopPrank();
    }

    function testStakeExpiry() public {
        vm.startPrank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);

        uint256 initialStake = vault.getDelegateStake(user1, address(onlyPaws));
        assertEq(
            initialStake,
            onlyPaws.PAW_STAKE_AMOUNT(),
            "Initial stake incorrect"
        );

        vm.warp(block.timestamp + onlyPaws.REWARD_DURATION() + 1);
        onlyPaws.checkExpiredStakes();

        uint256 finalStake = vault.getDelegateStake(user1, address(onlyPaws));
        assertEq(finalStake, 0, "Stake should be withdrawn after expiry");

        (, , bool isActive) = onlyPaws.pawStakes(user1, 1);
        assertFalse(isActive, "Stake should be inactive");

        vm.stopPrank();
    }

    function testActiveUserTracking() public {
        vm.prank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);
        assertTrue(onlyPaws.isActiveUser(user1), "User1 should be active");

        vm.warp(block.timestamp + onlyPaws.REWARD_DURATION() + 1);
        onlyPaws.checkExpiredStakes();
        assertFalse(
            onlyPaws.isActiveUser(user1),
            "User1 should be inactive after expiry"
        );
    }

    function testMultipleDelegateStakes() public {
        vm.startPrank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(2);

        uint256 totalDelegatedStake = vault.getDelegateStake(
            user1,
            address(onlyPaws)
        );
        assertEq(
            totalDelegatedStake,
            onlyPaws.PAW_STAKE_AMOUNT() * 2,
            "Incorrect total delegated stake"
        );

        vm.stopPrank();
    }
}
