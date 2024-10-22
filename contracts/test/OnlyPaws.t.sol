// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/OnlyPaws.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Updated Mock BGT Token
contract MockBGT is ERC20 {
    constructor() ERC20("Mock BGT", "MBGT") {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function redeem(address receiver, uint256 amount) public {
        require(balanceOf(msg.sender) >= amount, "Insufficient BGT balance");
        _burn(msg.sender, amount);
        console.log("BGT redeemed. Sender:", msg.sender);
        console.log("BGT redeemed. Amount:", amount);
        console.log("BGT redeemed. Receiver:", receiver);
        console.log("BGT balance after redeem:", balanceOf(msg.sender));
        payable(receiver).transfer(amount);
    }

    receive() external payable {}
}

// Mock Rewards Vault
contract MockRewardsVault is IBerachainRewardsVault {
    MockBGT public bgtToken;
    uint256 public stakedAmount;
    uint256 public constant REWARD_RATE = 1e15; // 0.001 BGT per second

    constructor(address _bgtToken) {
        bgtToken = MockBGT(payable(_bgtToken));
    }

    function stake(uint256 amount) external {
        stakedAmount += amount;
    }

    function getReward(address account) external returns (uint256) {
        uint256 reward = REWARD_RATE * 7 days; // 1 week of rewards
        bgtToken.transfer(account, reward);
        return reward;
    }

    receive() external payable {}
}

// Mock Rewards Vault Factory
contract MockRewardsVaultFactory is IBerachainRewardsVaultFactory {
    address public immutable rewardsVault;

    constructor(address _rewardsVault) {
        rewardsVault = _rewardsVault;
    }

    function createRewardsVault(
        address stakingToken
    ) external returns (address) {
        return rewardsVault;
    }
}

contract OnlyPawsTest is Test {
    OnlyPaws public onlyPaws;
    MockBGT public bgtToken;
    MockRewardsVault public rewardsVault;
    MockRewardsVaultFactory public rewardsVaultFactory;

    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);

    uint256 constant INITIAL_BALANCE = 1000 ether;
    uint256 constant PAW_PRICE = 0.1 ether;
    uint256 constant WEEKLY_REWARD = 100 ether;

    receive() external payable {}

    address constant BGT_ADDRESS = 0xbDa130737BDd9618301681329bF2e46A016ff9Ad;

    function setUp() public {
        // Deploy MockBGT at the specific address
        vm.etch(BGT_ADDRESS, address(new MockBGT()).code);
        bgtToken = MockBGT(payable(BGT_ADDRESS));

        rewardsVault = new MockRewardsVault(BGT_ADDRESS);
        rewardsVaultFactory = new MockRewardsVaultFactory(
            address(rewardsVault)
        );

        vm.etch(
            0x2B6e40f65D82A0cB98795bC7587a71bfa49fBB2B,
            address(rewardsVaultFactory).code
        );

        onlyPaws = new OnlyPaws();

        vm.deal(user1, INITIAL_BALANCE);
        vm.deal(user2, INITIAL_BALANCE);
        vm.deal(user3, INITIAL_BALANCE);
        vm.deal(address(this), INITIAL_BALANCE);
        vm.deal(BGT_ADDRESS, INITIAL_BALANCE * 100); // Ensure MockBGT has enough ETH

        bgtToken.mint(address(rewardsVault), WEEKLY_REWARD * 52);
        bgtToken.mint(address(onlyPaws), WEEKLY_REWARD * 52 * 10);

        console.log(
            "RewardsVault BGT balance:",
            bgtToken.balanceOf(address(rewardsVault))
        );
        console.log(
            "OnlyPaws BGT balance:",
            bgtToken.balanceOf(address(onlyPaws))
        );

        vm.startPrank(address(this));
        onlyPaws.addPawImage(1, PAW_PRICE);
        onlyPaws.addPawImage(2, PAW_PRICE);
        onlyPaws.addPawImage(3, PAW_PRICE);
        vm.stopPrank();
    }

    function testRewardDistribution() public {
        vm.prank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);

        vm.warp(block.timestamp + 3 days);
        onlyPaws.harvestRewards();

        vm.prank(user2);
        onlyPaws.purchasePaw{value: PAW_PRICE}(2);

        vm.warp(block.timestamp + 4 days);
        onlyPaws.harvestRewards();

        uint256 user1BalanceBefore = user1.balance;
        vm.prank(user1);
        onlyPaws.claimRewards();
        uint256 user1Rewards = user1.balance - user1BalanceBefore;

        uint256 user2BalanceBefore = user2.balance;
        vm.prank(user2);
        onlyPaws.claimRewards();
        uint256 user2Rewards = user2.balance - user2BalanceBefore;

        console.log("User 1 rewards:", user1Rewards);
        console.log("User 2 rewards:", user2Rewards);

        assertGt(user1Rewards, user2Rewards);
        assertApproxEqRel(user1Rewards, (user2Rewards * 7) / 4, 0.01e18);
    }

    function testRewardDistributionOverTime() public {
        vm.prank(user1);
        onlyPaws.purchasePaw{value: PAW_PRICE}(1);

        vm.warp(block.timestamp + 1 days);
        onlyPaws.harvestRewards();

        vm.prank(user2);
        onlyPaws.purchasePaw{value: PAW_PRICE}(2);

        vm.warp(block.timestamp + 4 days);
        onlyPaws.harvestRewards();

        vm.prank(user3);
        onlyPaws.purchasePaw{value: PAW_PRICE}(3);

        vm.warp(block.timestamp + 3 days);
        onlyPaws.harvestRewards();

        uint256 user1BalanceBefore = user1.balance;
        vm.prank(user1);
        onlyPaws.claimRewards();
        uint256 user1Rewards = user1.balance - user1BalanceBefore;

        uint256 user2BalanceBefore = user2.balance;
        vm.prank(user2);
        onlyPaws.claimRewards();
        uint256 user2Rewards = user2.balance - user2BalanceBefore;

        uint256 user3BalanceBefore = user3.balance;
        vm.prank(user3);
        onlyPaws.claimRewards();
        uint256 user3Rewards = user3.balance - user3BalanceBefore;

        console.log("User 1 rewards:", user1Rewards);
        console.log("User 2 rewards:", user2Rewards);
        console.log("User 3 rewards:", user3Rewards);

        assertGt(user1Rewards, user3Rewards);
        assertGt(user2Rewards, user3Rewards);

        uint256 totalDays = 8;
        assertApproxEqRel(
            user1Rewards,
            (WEEKLY_REWARD * 8) / totalDays,
            0.01e18
        );
        assertApproxEqRel(
            user2Rewards,
            (WEEKLY_REWARD * 7) / totalDays,
            0.01e18
        );
        assertApproxEqRel(
            user3Rewards,
            (WEEKLY_REWARD * 3) / totalDays,
            0.01e18
        );
    }
}
