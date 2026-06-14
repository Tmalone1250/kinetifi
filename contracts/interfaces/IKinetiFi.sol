// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
// Shared Mantle DeFi Interfaces for KinetiFi contracts
// ─────────────────────────────────────────────────────────────────────────────

/// @dev Wrapped MNT (WMNT) – native-gas wrapper on Mantle.
interface IWMNT {
    function deposit() external payable;
    function withdraw(uint256) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @dev Merchant Moe Liquidity Book V2.2 Router.
interface ILBRouter {
    enum Version { V1, V2, V2_1, V2_2 }

    struct Path {
        uint256[] pairBinSteps;
        Version[]  versions;
        address[]  tokenPath;
    }

    struct LiquidityParameters {
        address  tokenX;
        address  tokenY;
        uint256  binStep;
        uint256  amountX;
        uint256  amountY;
        uint256  amountXMin;
        uint256  amountYMin;
        uint256  activeIdDesired;
        uint256  idSlippage;
        int256[] deltaIds;
        uint256[] distributionX;
        uint256[] distributionY;
        address  to;
        address  refundTo;
        uint256  deadline;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Path calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256 amountOut);

    function addLiquidity(LiquidityParameters calldata params)
        external
        returns (
            uint256 amountXAdded,
            uint256 amountYAdded,
            uint256 amountLeftX,
            uint256 amountLeftY,
            uint256[] memory depositIds,
            uint256[] memory liquidityMinted
        );
}

/// @dev Uniswap V3-style SwapRouter (Agni Finance / FusionX on Mantle).
interface ISwapRouterV3 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        returns (uint256 amountOut);
}

/// @dev Aave V3 / Lendle Pool – flash loan entry point.
interface IAavePool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

/// @dev Aave V3 flash loan callback.
interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}
