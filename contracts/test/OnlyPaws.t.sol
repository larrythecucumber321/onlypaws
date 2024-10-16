pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/OnlyPaws.sol";
import "./mocks/MockERC20.sol";
import "./mocks/MockRewardsVault.sol";

contract OnlyPawsTest is Test {
    OnlyPaws public onlyPaws;
    MockERC20 public bgtToken;
    MockRewardsVault public rewardsVault;

    address public user1 = address(0x1);
    address public user2 = address(0x2);

    function setUp() public {
        bgtToken = new MockERC20("BGT Token", "BGT", 18);
        rewardsVault = new MockRewardsVault(address(bgtToken));
        onlyPaws = new OnlyPaws(address(rewardsVault), address(bgtToken));

        vm.deal(user1, 1 ether);
        vm.deal(user2, 1 ether);
    }

    function testPurchasePaw() public {
        vm.prank(user1);
        onlyPaws.purchasePaw{value: 0.1 ether}(1);

        assertEq(onlyPaws.pawOwners(1), user1);
        assertEq(onlyPaws.getUserPaws(user1)[0], 1);
    }

    function testCannotPurchaseSamePawTwice() public {
        vm.prank(user1);
        onlyPaws.purchasePaw{value: 0.1 ether}(1);

        vm.prank(user2);
        vm.expectRevert("Paw already purchased");
        onlyPaws.purchasePaw{value: 0.1 ether}(1);
    }

    function testClaimRewards() public {
        vm.prank(user1);
        onlyPaws.purchasePaw{value: 0.1 ether}(1);

        vm.warp(block.timestamp + 3 days);

        vm.prank(user1);
        onlyPaws.claimRewards();

        assertEq(rewardsVault.delegatedStake(user1), 100 * 1e18);
    }

    function testCannotClaimRewardsAfterDuration() public {
        vm.prank(user1);
        onlyPaws.purchasePaw{value: 0.1 ether}(1);

        vm.warp(block.timestamp + 8 days);

        vm.prank(user1);
        vm.expectRevert("No rewards to claim");
        onlyPaws.claimRewards();
    }

    function testWithdrawFunds() public {
        vm.prank(user1);
        onlyPaws.purchasePaw{value: 0.1 ether}(1);

        vm.prank(user2);
        onlyPaws.purchasePaw{value: 0.1 ether}(2);

        uint256 initialBalance = address(this).balance;
        onlyPaws.withdrawFunds();
        uint256 finalBalance = address(this).balance;

        assertEq(finalBalance - initialBalance, 0.2 ether);
    }
}
