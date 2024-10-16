// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {POLTech, PoLStakingToken, IBerachainRewardsVault} from "../src/POLTech.sol";

contract POLTechTest is Test {
    POLTech polTech;
    PoLStakingToken stakingToken;
    IBerachainRewardsVault polVault;
    address owner;
    address addr1;
    address addr2;

    function setUp() public {
        owner = address(this);
        addr1 = address(0x123);
        addr2 = address(0x456);

        polTech = new POLTech();
        stakingToken = polTech.stakingToken();
    }

    function testBuyShares() public {
        uint256 sharesToBuy = 10;
        (uint256 buyPrice, uint256 newPrice) = polTech.getBuyPrice(
            addr2,
            sharesToBuy
        );

        vm.deal(addr1, buyPrice);
        vm.prank(addr1);

        vm.expectEmit(true, true, false, true);
        emit POLTech.SharesBought(
            addr1,
            addr2,
            sharesToBuy,
            buyPrice,
            newPrice
        );

        polTech.buyShares{value: buyPrice}(addr2, sharesToBuy);

        uint256 balance = polTech.getSharesBalance(addr1, addr2);
        assertEq(balance, sharesToBuy);

        uint256 actualNewSharePrice = polTech.getSharePrice(addr2);
        assertEq(actualNewSharePrice, newPrice);
        assertGt(actualNewSharePrice, polTech.INITIAL_SHARE_PRICE());
    }

    function testSellShares() public {
        uint256 sharesToBuy = 10;
        (uint256 buyPrice, ) = polTech.getBuyPrice(addr2, sharesToBuy);

        vm.deal(addr1, buyPrice);
        vm.prank(addr1);
        polTech.buyShares{value: buyPrice}(addr2, sharesToBuy);

        uint256 sharesToSell = 5;
        (uint256 saleReturn, uint256 newPrice) = polTech.getSellPrice(
            addr2,
            sharesToSell
        );

        vm.prank(addr1);

        vm.expectEmit(true, true, false, true);
        emit POLTech.SharesSold(
            addr1,
            addr2,
            sharesToSell,
            saleReturn,
            newPrice
        );

        polTech.sellShares(addr2, sharesToSell);

        uint256 balance = polTech.getSharesBalance(addr1, addr2);
        assertEq(balance, sharesToBuy - sharesToSell);

        uint256 actualNewSharePrice = polTech.getSharePrice(addr2);
        assertEq(actualNewSharePrice, newPrice);
    }

    function testBuyPriceIncreases() public view {
        (uint256 price1, ) = polTech.getBuyPrice(addr2, 1);
        (uint256 price10, ) = polTech.getBuyPrice(addr2, 10);
        assertGt(price10, price1 * 10);
    }

    function testSellPriceDecreases() public {
        // First, buy some shares
        uint256 sharesToBuy = 20;
        (uint256 buyPrice, ) = polTech.getBuyPrice(addr2, sharesToBuy);
        vm.deal(addr1, buyPrice);
        vm.prank(addr1);
        polTech.buyShares{value: buyPrice}(addr2, sharesToBuy);

        (uint256 sellPrice1, ) = polTech.getSellPrice(addr2, 1);
        (uint256 sellPrice10, ) = polTech.getSellPrice(addr2, 10);
        assertLt(sellPrice10, sellPrice1 * 10);
    }

    function testGetBuyAndSellPriceConsistency() public {
        // Check consistency when amount is 0
        (uint256 buyTotalCost, uint256 buyEndPrice) = polTech.getBuyPrice(
            addr2,
            0
        );
        (uint256 sellTotalReturn, uint256 sellEndPrice) = polTech.getSellPrice(
            addr2,
            0
        );

        assertEq(buyTotalCost, 0);
        assertEq(sellTotalReturn, 0);
        assertEq(buyEndPrice, sellEndPrice);
        assertEq(buyEndPrice, polTech.INITIAL_SHARE_PRICE());

        // Buy some shares to change the price
        vm.startPrank(addr1);

        uint256 buyAmount = 5;
        (uint256 buyPrice, uint256 newBuyPrice) = polTech.getBuyPrice(
            addr2,
            buyAmount
        );
        vm.deal(addr1, buyPrice);
        polTech.buyShares{value: buyPrice}(addr2, buyAmount);

        // Check new share price
        assertEq(polTech.getSharePrice(addr2), newBuyPrice);

        // Sell the shares
        (uint256 sellPrice, uint256 newSellPrice) = polTech.getSellPrice(
            addr2,
            buyAmount
        );
        polTech.sellShares(addr2, buyAmount);

        // Check price has returned to initial
        assertEq(polTech.getSharePrice(addr2), polTech.INITIAL_SHARE_PRICE());
        assertEq(newSellPrice, polTech.INITIAL_SHARE_PRICE());

        vm.stopPrank();
    }

    function testMultipleBuysAndSells() public {
        address buyer1 = address(0x123);
        address buyer2 = address(0x456);
        address subject = address(0x789);

        vm.startPrank(buyer1);
        vm.deal(buyer1, 10 ether);

        // Buy 5 shares for buyer1
        (uint256 buyPrice1, ) = polTech.getBuyPrice(subject, 5);
        polTech.buyShares{value: buyPrice1}(subject, 5);

        // Buy 3 more shares for buyer1
        (uint256 buyPrice2, ) = polTech.getBuyPrice(subject, 3);
        polTech.buyShares{value: buyPrice2}(subject, 3);

        vm.stopPrank();

        // Introduce a second buyer (buyer2)
        vm.startPrank(buyer2);
        vm.deal(buyer2, 10 ether);

        // Buy 2 shares for buyer2
        (uint256 buyPrice3, ) = polTech.getBuyPrice(subject, 2);
        polTech.buyShares{value: buyPrice3}(subject, 2);

        vm.stopPrank();

        // Back to buyer1
        vm.startPrank(buyer1);

        // Verify total shares for buyer1
        assertEq(polTech.getSharesBalance(buyer1, subject), 8);

        // Sell 2 shares for buyer1
        uint256 balanceBefore = buyer1.balance;
        polTech.sellShares(subject, 2);
        uint256 balanceAfter = buyer1.balance;

        // Verify remaining shares for buyer1
        assertEq(polTech.getSharesBalance(buyer1, subject), 6);

        // Verify received amount is greater than initial stake for 2 shares
        assertGt(balanceAfter - balanceBefore, (buyPrice1 * 2) / 5);

        // Verify lots for buyer1
        (uint256 lot1Shares, uint256 lot1Stake) = polTech.shareLots(
            buyer1,
            subject,
            0
        );
        (uint256 lot2Shares, uint256 lot2Stake) = polTech.shareLots(
            buyer1,
            subject,
            1
        );

        assertEq(lot1Shares, 3, "First lot should have 3 shares remaining");
        assertEq(lot2Shares, 3, "Second lot should still have 3 shares");
        assertLt(lot1Stake, buyPrice1, "First lot stake should be reduced");
        assertEq(
            lot2Stake,
            buyPrice2,
            "Second lot stake should remain unchanged"
        );

        // Verify total shares for buyer2
        assertEq(polTech.getSharesBalance(buyer2, subject), 2);

        // Verify lot for buyer2
        (uint256 lot3Shares, uint256 lot3Stake) = polTech.shareLots(
            buyer2,
            subject,
            0
        );
        assertEq(lot3Shares, 2, "buyer2's lot should have 2 shares");
        assertEq(
            lot3Stake,
            buyPrice3,
            "buyer2's lot stake should match their buy price"
        );

        // Verify that buyer2's buy price is higher than buyer1's first buy price (per share)
        assertGt(
            buyPrice3 / 2,
            buyPrice1 / 5,
            "buyer2's per-share price should be higher than buyer1's first buy"
        );

        // Verify that the total share supply has increased correctly
        assertEq(
            polTech.getSharesSupply(subject),
            8,
            "Total share supply should be 8"
        );

        // Verify that the share price has increased
        uint256 finalSharePrice = polTech.getSharePrice(subject);
        assertGt(
            finalSharePrice,
            polTech.INITIAL_SHARE_PRICE(),
            "Share price should have increased"
        );

        vm.stopPrank();
    }
}

contract MockVault is IBerachainRewardsVault {
    mapping(address => uint256) public balances;

    function delegateStake(address account, uint256 amount) external override {
        balances[account] += amount;
    }

    function delegateWithdraw(
        address account,
        uint256 amount
    ) external override {
        require(balances[account] >= amount, "Not enough balance");
        balances[account] -= amount;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function getDelegateStake(
        address account,
        address delegate
    ) external view returns (uint256) {
        return balances[account];
    }
}
