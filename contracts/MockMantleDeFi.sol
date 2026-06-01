// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockMantleDeFi {
    // --- Mock Price Oracle ---
    uint256 public fbtcPriceUsd = 65000; // Starting price: $65k
    
    // --- User State ---
    mapping(address => uint256) public suppliedFBTC;
    mapping(address => uint256) public borrowedUSDC;
    mapping(address => uint256) public unharvestedLPRewardsUSDC;

    event CollateralSupplied(address user, uint256 amount);
    event DebtRepaid(address user, uint256 amount);
    event RewardsCompounded(address user, uint256 amount);
    event MarketCrash(uint256 newPrice);

    // 1. Simulate the market crashing (God-mode for testing)
    function setFBTCPrice(uint256 _newPrice) external {
        fbtcPriceUsd = _newPrice;
        emit MarketCrash(_newPrice);
    }

    // 2. Set up initial simulation state
    function mockInitialPosition(uint256 _fbtcAmount, uint256 _usdcBorrowed, uint256 _lpRewards) external {
        suppliedFBTC[msg.sender] = _fbtcAmount;
        borrowedUSDC[msg.sender] = _usdcBorrowed;
        unharvestedLPRewardsUSDC[msg.sender] = _lpRewards;
    }

    // 3. The Agent's RESCUE execution target
    function rebalanceDebt(uint256 repaymentAmountUSDC) external {
        require(borrowedUSDC[msg.sender] >= repaymentAmountUSDC, "Cannot repay more than owed");
        borrowedUSDC[msg.sender] -= repaymentAmountUSDC;
        
        // In a real protocol, this would withdraw from the LP and burn USDC.
        // Here, we just reduce the debt state to prove the agent fired correctly.
        emit DebtRepaid(msg.sender, repaymentAmountUSDC);
    }

    // 4. The Agent's COMPOUND execution target
    function compoundFlywheel() external {
        uint256 rewards = unharvestedLPRewardsUSDC[msg.sender];
        require(rewards > 0, "No rewards to compound");
        
        unharvestedLPRewardsUSDC[msg.sender] = 0;
        
        // Simulate swapping USDC to FBTC and supplying it
        uint256 fbtcPurchased = (rewards * 1e18) / fbtcPriceUsd; // Simplified math
        suppliedFBTC[msg.sender] += fbtcPurchased;
        
        emit RewardsCompounded(msg.sender, rewards);
    }

    // --- Read Functions for our LTV Monitor ---
    function getSuppliedValueUSD(address user) external view returns (uint256) {
        // Assume suppliedFBTC is stored in 1e18 format
        return (suppliedFBTC[user] * fbtcPriceUsd) / 1e18;
    }
}
