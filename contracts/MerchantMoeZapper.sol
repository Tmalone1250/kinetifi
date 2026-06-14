// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MerchantMoeZapper v2
 * @notice Zaps Native MNT into a Merchant Moe (Liquidity Book V2.1) LP position.
 * @dev Fix: Uses the correct V2.1 LBRouter interface with Path struct for swaps.
 *      Handles atomic wrap -> swap -> addLiquidity -> refund dust.
 */

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IWMNT is IERC20 {
    function deposit() external payable;
    function withdraw(uint256) external;
}

interface ILBRouter {
    // ── V2.1 types ──────────────────────────────────────────────────────────
    enum Version {
        V1,
        V2,
        V2_1,
        V2_2
    }

    struct Path {
        uint256[] pairBinSteps;
        Version[] versions;
        IERC20[] tokenPath;
    }

    // ── V2.1 swap (the one that actually exists on Merchant Moe's router) ──
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Path memory path,
        address to,
        uint256 deadline
    ) external returns (uint256 amountOut);

    // ── addLiquidity (same struct in V2 and V2.1) ───────────────────────────
    struct LiquidityParameters {
        IERC20 tokenX;
        IERC20 tokenY;
        uint256 binStep;
        uint256 amountX;
        uint256 amountY;
        uint256 amountXMin;
        uint256 amountYMin;
        uint256 activeIdDesired;
        uint256 idSlippage;
        int256[] deltaIds;
        uint256[] distributionX;
        uint256[] distributionY;
        address to;
        address refundTo;
        uint256 deadline;
    }

    function addLiquidity(LiquidityParameters calldata liquidityParameters)
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

contract MerchantMoeZapper {
    ILBRouter public immutable lbRouter;
    IWMNT public immutable wmnt;

    constructor(address _lbRouter, address _wmnt) {
        lbRouter = ILBRouter(_lbRouter);
        wmnt = IWMNT(_wmnt);
    }

    // Needed to receive unwrapped MNT from the WMNT contract
    receive() external payable {}

    struct ZapParams {
        IERC20 tokenB; // Paired token (e.g. USDT)
        uint256 swapAmount; // WMNT amount to swap to tokenB (~50% of total)
        uint256 amountOutMin; // Min tokenB from swap — 3% slippage applied off-chain
        uint256[] pairBinSteps; // Routing bin steps (e.g. [25])
        IERC20[] tokenPath; // Swap route: [WMNT, tokenB]

        // Liquidity parameters
        uint256 binStep; // Pool bin step
        uint256 amountXMin; // Min WMNT to deposit into LP — 3% slippage applied
        uint256 amountYMin; // Min tokenB to deposit into LP — 3% slippage applied
        uint256 activeIdDesired; // Current active bin ID (fetched live off-chain)
        uint256 idSlippage; // Bin-ID drift tolerance (e.g. 5)
        int256[] deltaIds; // Bins to provide liquidity to (e.g. [0] = active bin only)
        uint256[] distributionX; // tokenX distribution per bin (1e18 = 100%)
        uint256[] distributionY; // tokenY distribution per bin (1e18 = 100%)
        bool wmntIsTokenX; // True if WMNT == tokenX in the LBPair
    }

    /**
     * @notice Zap Native MNT into a Merchant Moe V2.1 LB Pool.
     * @param params Configuration for swapping and adding liquidity.
     */
    function zapInMNT(ZapParams calldata params) external payable {
        require(msg.value > 0, "No MNT provided");
        require(params.swapAmount > 0 && params.swapAmount < msg.value, "Invalid swap amount");

        // 1. Wrap native MNT → WMNT
        wmnt.deposit{value: msg.value}();

        // 2. Build V2.2 Path struct and swap WMNT → tokenB
        ILBRouter.Version[] memory versions = new ILBRouter.Version[](1);
        versions[0] = ILBRouter.Version.V2_2;

        ILBRouter.Path memory swapPath =
            ILBRouter.Path({pairBinSteps: params.pairBinSteps, versions: versions, tokenPath: params.tokenPath});

        wmnt.approve(address(lbRouter), params.swapAmount);
        uint256 tokenBReceived = lbRouter.swapExactTokensForTokens(
            params.swapAmount, params.amountOutMin, swapPath, address(this), block.timestamp
        );

        // 3. Approve both tokens for addLiquidity
        uint256 remainingWMNT = wmnt.balanceOf(address(this));
        wmnt.approve(address(lbRouter), remainingWMNT);
        params.tokenB.approve(address(lbRouter), tokenBReceived);

        // 4. Build LiquidityParameters and add liquidity
        ILBRouter.LiquidityParameters memory liqParams = ILBRouter.LiquidityParameters({
            tokenX: params.wmntIsTokenX ? IERC20(address(wmnt)) : params.tokenB,
            tokenY: params.wmntIsTokenX ? params.tokenB : IERC20(address(wmnt)),
            binStep: params.binStep,
            amountX: params.wmntIsTokenX ? remainingWMNT : tokenBReceived,
            amountY: params.wmntIsTokenX ? tokenBReceived : remainingWMNT,
            amountXMin: params.amountXMin,
            amountYMin: params.amountYMin,
            activeIdDesired: params.activeIdDesired,
            idSlippage: params.idSlippage,
            deltaIds: params.deltaIds,
            distributionX: params.distributionX,
            distributionY: params.distributionY,
            to: msg.sender, // Mint LP ERC-1155 directly to user
            refundTo: address(this), // Return leftover tokens here for sweeping
            deadline: block.timestamp
        });

        lbRouter.addLiquidity(liqParams);

        // 5. Sweep all dust — CRITICAL: no funds trapped in this contract
        _refundDust(params.tokenB);
    }

    /**
     * @dev Sweeps all remaining tokenB and WMNT from the contract back to msg.sender.
     *      WMNT is unwrapped to native MNT before transfer.
     */
    function _refundDust(IERC20 tokenB) internal {
        // Sweep tokenB (e.g. USDT)
        uint256 tokenBBal = tokenB.balanceOf(address(this));
        if (tokenBBal > 0) {
            tokenB.transfer(msg.sender, tokenBBal);
        }

        // Sweep WMNT → unwrap to native MNT → send to caller
        uint256 wmntBal = wmnt.balanceOf(address(this));
        if (wmntBal > 0) {
            wmnt.withdraw(wmntBal);
            (bool ok,) = msg.sender.call{value: wmntBal}("");
            require(ok, "MNT dust refund failed");
        }
    }
}
