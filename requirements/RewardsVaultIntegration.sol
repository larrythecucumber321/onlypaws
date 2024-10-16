// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface IBerachainRewardsVaultFactory {
    function createRewardsVault(
        address stakingToken
    ) external returns (address);
}

interface IBerachainRewardsVault {
    function delegateStake(address user, uint256 amount) external;
    function delegateWithdraw(address user, uint256 amount) external;
}

contract PoLStakingToken is ERC20 {
    address public immutable polTech;

    constructor(address _polTech) ERC20("PoL Staking Token", "PoLST") {
        polTech = _polTech;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == polTech, "Only PoLTech can mint");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == polTech, "Only PoLTech can burn");
        _burn(from, amount);
    }
}

contract POLTech {
    struct Lot {
        uint256 shares;
        uint256 stakedAmount;
    }

    mapping(address => mapping(address => Lot[])) public shareLots;
    mapping(address => mapping(address => uint256)) public sharesBalance;
    mapping(address => uint256) public sharePrice;
    mapping(address => uint256) public sharesSupply;

    IBerachainRewardsVault public immutable polVault;
    PoLStakingToken public immutable stakingToken;

    uint256 public constant INITIAL_SHARE_PRICE = 1e17; // 0.1 BERA
    uint256 public constant PRICE_CHANGE_FACTOR = 5e16; // 0.05 BERA

    event SharesBought(
        address indexed buyer,
        address indexed subject,
        uint256 amount,
        uint256 totalPrice,
        uint256 endPrice
    );
    event SharesSold(
        address indexed seller,
        address indexed subject,
        uint256 amount,
        uint256 totalReturn,
        uint256 endPrice
    );

    constructor() {
        address vaultFactory = 0x2B6e40f65D82A0cB98795bC7587a71bfa49fBB2B;

        stakingToken = new PoLStakingToken(address(this));

        polVault = IBerachainRewardsVault(
            IBerachainRewardsVaultFactory(vaultFactory).createRewardsVault(
                address(stakingToken)
            )
        );
    }

    function buyShares(address subject, uint256 amount) external payable {
        require(amount > 0, "Must buy at least 1 share");
        (uint256 buyPrice, uint256 newPrice) = getBuyPrice(subject, amount);
        require(msg.value >= buyPrice, "Insufficient payment");

        sharesBalance[msg.sender][subject] += amount;
        sharesSupply[subject] += amount;

        // Update share price to the new price after purchase
        sharePrice[subject] = newPrice;

        // Create a new lot for this purchase
        shareLots[msg.sender][subject].push(
            Lot({shares: amount, stakedAmount: buyPrice})
        );

        // Mint and stake according to the value of shares bought
        stakingToken.mint(address(this), buyPrice);
        stakingToken.approve(address(polVault), buyPrice);
        polVault.delegateStake(msg.sender, buyPrice);

        emit SharesBought(msg.sender, subject, amount, buyPrice, newPrice);

        // Refund excess payment
        if (msg.value > buyPrice) {
            (bool success, ) = msg.sender.call{value: msg.value - buyPrice}("");
            require(success, "Transfer failed");
        }
    }

    function sellShares(address subject, uint256 amount) external {
        require(
            sharesBalance[msg.sender][subject] >= amount,
            "Not enough shares"
        );
        require(sharesSupply[subject] >= amount, "Not enough shares in supply");

        (uint256 saleReturn, uint256 newPrice) = getSellPrice(subject, amount);

        uint256 sharesToSell = amount;
        uint256 totalStakeToWithdraw = 0;

        // Use FIFO to determine which lots to sell from
        while (sharesToSell > 0) {
            Lot storage lot = shareLots[msg.sender][subject][0];

            if (lot.shares <= sharesToSell) {
                // Sell entire lot
                totalStakeToWithdraw += lot.stakedAmount;
                sharesToSell -= lot.shares;
                removeLot(msg.sender, subject);
            } else {
                // Sell part of the lot
                uint256 partialStake = (lot.stakedAmount * sharesToSell) /
                    lot.shares;
                totalStakeToWithdraw += partialStake;
                lot.shares -= sharesToSell;
                lot.stakedAmount -= partialStake;
                sharesToSell = 0;
            }
        }

        sharesBalance[msg.sender][subject] -= amount;
        sharesSupply[subject] -= amount;

        // Update share price to the new price after sale
        sharePrice[subject] = newPrice;

        // Withdraw staked amount
        polVault.delegateWithdraw(msg.sender, totalStakeToWithdraw);
        stakingToken.burn(address(this), totalStakeToWithdraw);

        // Transfer sale return to user
        (bool success, ) = msg.sender.call{value: saleReturn}("");
        require(success, "Transfer failed");

        emit SharesSold(msg.sender, subject, amount, saleReturn, newPrice);
    }

    function removeLot(address user, address subject) internal {
        for (uint i = 0; i < shareLots[user][subject].length - 1; i++) {
            shareLots[user][subject][i] = shareLots[user][subject][i + 1];
        }
        shareLots[user][subject].pop();
    }

    function getBuyPrice(
        address subject,
        uint256 amount
    ) public view returns (uint256 totalCost, uint256 endPrice) {
        uint256 price = getSharePrice(subject);

        totalCost = 0;
        for (uint256 i = 0; i < amount; i++) {
            totalCost += price;
            price = price + PRICE_CHANGE_FACTOR;
        }

        endPrice = price;
        return (totalCost, endPrice);
    }

    function getSellPrice(
        address subject,
        uint256 amount
    ) public view returns (uint256 totalReturn, uint256 endPrice) {
        require(sharesSupply[subject] >= amount, "Not enough shares in supply");

        uint256 price = getSharePrice(subject);

        totalReturn = 0;
        for (uint256 i = 0; i < amount; i++) {
            price = price - PRICE_CHANGE_FACTOR;
            totalReturn += price;
        }

        endPrice = price;
        return (totalReturn, endPrice);
    }

    function getSharesBalance(
        address user,
        address subject
    ) external view returns (uint256) {
        return sharesBalance[user][subject];
    }

    function getSharePrice(address subject) public view returns (uint256) {
        uint256 supply = sharesSupply[subject];
        return INITIAL_SHARE_PRICE + (supply * PRICE_CHANGE_FACTOR);
    }

    function getSharesSupply(address subject) external view returns (uint256) {
        return sharesSupply[subject];
    }
}
