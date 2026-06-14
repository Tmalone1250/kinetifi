// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IKinetiFi.sol";

/**
 * @title  KinetiFiArbitrage
 * @notice Atomic cross-DEX arbitrage executor funded by Aave V3 flash loans.
 *         Identifies a price spread between two Mantle DEXes (Agni V3 and
 *         Merchant Moe LB 2.2), borrows capital from Aave for a single block,
 *         executes both swap legs, repays the loan + premium, and sweeps the
 *         net profit to the owner.
 *
 * Aave V3 Pool on Mantle Mainnet: 0x458F293454fE0d67EC0655f3672301301DD51422
 *
 * Zero-Trust Model
 * ────────────────
 * • Owner    – sets executor, receives profits, can emergency-sweep tokens.
 * • Executor – AI Agent EOA, can only call `executeArbitrage`.
 *
 * Tiered Profitability Threshold  (_minProfit)
 * ────────────────────────────────────────────
 *   Borrowed  <  1,000 tokens  →  0.05  tokens
 *   Borrowed  < 10,000 tokens  →  0.20  tokens
 *   Borrowed  <100,000 tokens  →  1.00  tokens
 *   Borrowed  ≥100,000 tokens  →  1% of borrowed amount
 *
 * (Uses 1e18 = 1 token, consistent with WMNT decimals)
 *
 * Dust Sweeping
 * ─────────────
 * _sweepERC20 and _sweepNative forward any residual token fractions to the
 * owner immediately after execution.  No capital should remain idle here.
 */
contract KinetiFiArbitrage is Ownable, IFlashLoanSimpleReceiver {
    using SafeERC20 for IERC20;

    // ── Mantle Mainnet fixed addresses ────────────────────────────────────────
    address public constant AAVE_POOL  =
        0x458F293454fE0d67EC0655f3672301301DD51422;
    address public constant AGNI_ROUTER =
        0x319B69888b0d11cEC22caA5034e25FfFBDc88421;
    address public constant MOE_ROUTER  =
        0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a;

    // ── Access control ────────────────────────────────────────────────────────
    mapping(address => bool) public executors;

    // ── Events ────────────────────────────────────────────────────────────────
    event ExecutorSet(address indexed executor, bool status);
    event ArbitrageExecuted(
        address indexed asset,
        uint256 borrowed,
        uint256 premium,
        uint256 profit,
        uint256 timestamp
    );
    event DustSwept(address indexed token, uint256 amount);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyExecutorOrOwner() {
        require(
            msg.sender == owner() || executors[msg.sender],
            "KFA: not authorized"
        );
        _;
    }

    /// @dev Aave's pool calls executeOperation — only the Aave Pool may do so.
    modifier onlyAavePool() {
        require(msg.sender == AAVE_POOL, "KFA: caller is not Aave Pool");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setExecutor(address executor, bool status) external onlyOwner {
        executors[executor] = status;
        emit ExecutorSet(executor, status);
    }

    // ── Entry: AI Agent triggers the flash loan ───────────────────────────────

    /**
     * @notice Initiates a flash-loan-funded arbitrage cycle.
     *
     * @param asset           Token to borrow (e.g. WMNT, 18 decimals).
     * @param amount          Amount to borrow in asset units.
     * @param tokenB          Intermediate token (e.g. USDT).
     * @param v3Fee           Uniswap V3 pool fee tier for Agni leg (e.g. 3000).
     * @param v3AmountOutMin  Minimum `tokenB` from Agni leg.
     * @param moeBinStep      Merchant Moe pair bin step (e.g. 25).
     * @param moeAmountOutMin Minimum `asset` returned from Moe leg.
     */
    function executeArbitrage(
        address asset,
        uint256 amount,
        address tokenB,
        uint24  v3Fee,
        uint256 v3AmountOutMin,
        uint256 moeBinStep,
        uint256 moeAmountOutMin
    ) external onlyExecutorOrOwner {
        require(amount > 0, "KFA: zero amount");

        bytes memory params = abi.encode(
            tokenB,
            v3Fee,
            v3AmountOutMin,
            moeBinStep,
            moeAmountOutMin
        );

        IAavePool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0              // referralCode
        );
    }

    // ── Callback: Aave fires this after transferring the flash loan ───────────

    /**
     * @notice Aave V3 flash loan callback.
     * @dev    MUST approve `amount + premium` back to the Aave Pool before
     *         returning `true`.  Premium is read dynamically — never hardcoded.
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyAavePool returns (bool) {
        require(initiator == address(this), "KFA: invalid initiator");

        (
            address tokenB,
            uint24  v3Fee,
            uint256 v3AmountOutMin,
            uint256 moeBinStep,
            uint256 moeAmountOutMin
        ) = abi.decode(params, (address, uint24, uint256, uint256, uint256));

        // Leg 1: asset → tokenB on Agni (Uniswap V3 fork).
        uint256 tokenBReceived = _swapOnAgni(asset, tokenB, amount, v3Fee, v3AmountOutMin);

        // Leg 2: tokenB → asset on Merchant Moe LB V2.2.
        _swapOnMoe(tokenB, asset, tokenBReceived, moeBinStep, moeAmountOutMin);

        // Profitability check.
        uint256 totalOwed = amount + premium;
        uint256 assetBal  = IERC20(asset).balanceOf(address(this));
        require(assetBal >= totalOwed + _minProfit(amount), "KFA: trade not profitable");

        uint256 netProfit = assetBal - totalOwed;

        // Repay Aave, then send profit and sweep dust.
        IERC20(asset).safeIncreaseAllowance(AAVE_POOL, totalOwed);
        IERC20(asset).safeTransfer(owner(), netProfit);
        _sweepERC20(tokenB);
        _sweepNative();

        emit ArbitrageExecuted(asset, amount, premium, netProfit, block.timestamp);
        return true;
    }

    // ── Internal swap helpers (reduce stack depth in executeOperation) ────────

    /// @dev Leg 1: swap `tokenIn` → `tokenOut` on Agni Finance (Uniswap V3 fork).
    function _swapOnAgni(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24  fee,
        uint256 amountOutMin
    ) private returns (uint256) {
        IERC20(tokenIn).safeIncreaseAllowance(AGNI_ROUTER, amountIn);
        return ISwapRouterV3(AGNI_ROUTER).exactInputSingle(
            ISwapRouterV3.ExactInputSingleParams({
                tokenIn:           tokenIn,
                tokenOut:          tokenOut,
                fee:               fee,
                recipient:         address(this),
                deadline:          block.timestamp,
                amountIn:          amountIn,
                amountOutMinimum:  amountOutMin,
                sqrtPriceLimitX96: 0
            })
        );
    }

    /// @dev Leg 2: swap `tokenIn` → `tokenOut` on Merchant Moe LB V2.2.
    function _swapOnMoe(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 binStep,
        uint256 amountOutMin
    ) private {
        IERC20(tokenIn).safeIncreaseAllowance(MOE_ROUTER, amountIn);

        uint256[] memory pairBinSteps = new uint256[](1);
        pairBinSteps[0] = binStep;

        ILBRouter.Version[] memory versions = new ILBRouter.Version[](1);
        versions[0] = ILBRouter.Version.V2_2;

        address[] memory tokenPath = new address[](2);
        tokenPath[0] = tokenIn;
        tokenPath[1] = tokenOut;

        ILBRouter.Path memory path = ILBRouter.Path({
            pairBinSteps: pairBinSteps,
            versions:     versions,
            tokenPath:    tokenPath
        });

        ILBRouter(MOE_ROUTER).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            block.timestamp
        );
    }

    // ── Tiered profit threshold ───────────────────────────────────────────────

    /**
     * @notice Computes the minimum surplus (in `asset` units, 18-decimal) for a
     *         given borrow amount.
     *
     *         Tier table (1 token = 1e18 wei):
     *           Borrowed  <  1,000  →  0.05  tokens (5e16)
     *           Borrowed  < 10,000  →  0.20  tokens (2e17)
     *           Borrowed  <100,000  →  1.00  token  (1e18)
     *           Borrowed  ≥100,000  →  1% of borrowed
     *
     * @dev    Caller must adjust for non-18-decimal assets externally.
     */
    function _minProfit(uint256 borrowed) internal pure returns (uint256) {
        uint256 one = 1e18;
        if (borrowed < 1_000  * one) return 5e16;  // 0.05 tokens
        if (borrowed < 10_000 * one) return 2e17;  // 0.20 tokens
        if (borrowed < 100_000 * one) return 1e18; // 1.00 token
        return borrowed / 100;                      // 1%
    }

    // ── Dust sweepers ─────────────────────────────────────────────────────────

    /// @dev Transfers full ERC-20 balance from this contract to owner.
    function _sweepERC20(address token) internal {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) {
            IERC20(token).safeTransfer(owner(), bal);
            emit DustSwept(token, bal);
        }
    }

    /// @dev Transfers any native MNT balance from this contract to owner.
    function _sweepNative() internal {
        uint256 bal = address(this).balance;
        if (bal > 0) {
            (bool ok, ) = owner().call{value: bal}("");
            require(ok, "KFA: native sweep failed");
            emit DustSwept(address(0), bal);
        }
    }

    // ── Emergency owner sweeps ────────────────────────────────────────────────

    function sweepERC20(address token) external onlyOwner {
        _sweepERC20(token);
    }

    function sweepNative() external onlyOwner {
        _sweepNative();
    }

    // ── Native receive ────────────────────────────────────────────────────────
    receive() external payable {}
}
