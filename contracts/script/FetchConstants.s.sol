// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

interface ILBRouter {
    function getFactory() external view returns (address);
}

interface ILBPair {
    function getActiveId() external view returns (uint24 activeId);
}

interface IAavePool {
    function getReserveData(address asset) external view returns (
        uint256 configuration,
        uint128 liquidityIndex,
        uint128 currentLiquidityRate,
        uint128 variableBorrowIndex,
        uint128 currentVariableBorrowRate,
        uint128 currentStableBorrowRate,
        uint40 lastUpdateTimestamp,
        uint16 id,
        address aTokenAddress,
        address stableDebtTokenAddress,
        address variableDebtTokenAddress,
        address interestRateStrategyAddress,
        uint128 accruedToTreasury,
        uint128 unbacked,
        uint128 isolationModeTotalDebt
    );
}

contract FetchConstants is Script {
    function run() external {
        address WMNT = 0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8;
        address AAVE_POOL = 0x458F293454fE0d67EC0655f3672301301DD51422;
        address LB_PAIR = 0x365722f12ceb2063286A268B03c654Df81B7C00F;

        // 1. Fetch aWMNT address
        try IAavePool(AAVE_POOL).getReserveData(WMNT) returns (
            uint256, uint128, uint128, uint128, uint128, uint128, uint40, uint16,
            address aTokenAddress,
            address, address, address, uint128, uint128, uint128
        ) {
            console.log("AAVE aWMNT Address:");
            console.log(aTokenAddress);
        } catch {
            console.log("Failed to fetch Aave reserve data");
        }

        // 2. Fetch Active ID for LB Pair
        try ILBPair(LB_PAIR).getActiveId() returns (uint24 activeId) {
            console.log("Active Bin ID for WMNT/USDT:");
            console.logUint(activeId);
        } catch {
            console.log("Failed to fetch LB Pair active ID");
        }
    }
}
