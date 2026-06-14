// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./interfaces/IKinetiFi.sol";

/**
 * @title  KinetiFiController
 * @notice User-owned vault that lets the KinetiFi AI Agent execute whitelisted
 *         DeFi strategies (rebalance + auto-compound) on behalf of the owner,
 *         while keeping the owner as the sole withdrawal authority.
 *
 * Zero-Trust Execution Model
 * ──────────────────────────
 * • Owner     – full control, exclusive withdrawal rights.
 * • Executor  – AI Agent EOA, can call `rebalance` and `autoCompoundMoe` only.
 *               It cannot withdraw funds or redirect token flows externally.
 *
 * ERC-1155 Compatibility
 * ──────────────────────
 * Merchant Moe Liquidity Book V2.2 mints LP positions as ERC-1155 tokens.
 * This contract MUST implement IERC1155Receiver so that `addLiquidity` and
 * `zapInMNT` calls don't revert during the safeTransfer callback.
 */
contract KinetiFiController is Ownable, IERC1155Receiver {
    using SafeERC20 for IERC20;

    // ── Access control ────────────────────────────────────────────────────────
    /// @notice Addresses granted executor (AI Agent) permissions.
    mapping(address => bool) public executors;

    // ── Router whitelist ──────────────────────────────────────────────────────
    /// @notice Only these router addresses may be called during rebalance().
    mapping(address => bool) public whitelistedRouters;

    // ── Events ────────────────────────────────────────────────────────────────
    event ExecutorSet(address indexed executor, bool status);
    event RouterWhitelisted(address indexed router, bool status);
    event Rebalanced(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event AutoCompounded(address indexed stakingPool, uint256 timestamp);
    event WithdrewERC20(address indexed token, uint256 amount);
    event WithdrewERC1155(address indexed token, uint256 id, uint256 amount);
    event WithdrewNative(uint256 amount);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyExecutorOrOwner() {
        require(
            msg.sender == owner() || executors[msg.sender],
            "KFC: not authorized"
        );
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────
    /**
     * @param _whitelistedRouters  Initial set of trusted DEX routers.
     *                             Include Merchant Moe, Agni, FusionX etc.
     */
    constructor(address[] memory _whitelistedRouters) Ownable(msg.sender) {
        for (uint256 i; i < _whitelistedRouters.length; ++i) {
            whitelistedRouters[_whitelistedRouters[i]] = true;
            emit RouterWhitelisted(_whitelistedRouters[i], true);
        }
    }

    // ── Admin: executor management ────────────────────────────────────────────

    /// @notice Grant or revoke executor (AI Agent) status.
    function setExecutor(address executor, bool status) external onlyOwner {
        executors[executor] = status;
        emit ExecutorSet(executor, status);
    }

    /// @notice Add or remove a router from the execution whitelist.
    function setRouterWhitelist(address router, bool status) external onlyOwner {
        whitelistedRouters[router] = status;
        emit RouterWhitelisted(router, status);
    }

    // ── Core Strategy: Rebalance ──────────────────────────────────────────────

    /**
     * @notice Atomically swaps `tokenIn` for `tokenOut` via a whitelisted router.
     *
     * @param router        The DEX router to call (must be whitelisted).
     * @param swapData      ABI-encoded calldata for the router.
     * @param tokenIn       The token to sell.
     * @param amountIn      Exact amount of `tokenIn` to approve & spend.
     * @param tokenOut      The token to receive.
     * @param minAmountOut  Minimum acceptable output — reverts if not met.
     *
     * Security invariants enforced:
     *   1. Router must be whitelisted.
     *   2. `amountIn` is fully deducted from this contract's `tokenIn` balance.
     *   3. `tokenOut` balance increases by ≥ `minAmountOut`.
     *   4. Any residual router allowance is reset to zero after the call.
     */
    function rebalance(
        address router,
        bytes calldata swapData,
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 minAmountOut
    ) external onlyExecutorOrOwner {
        require(whitelistedRouters[router], "KFC: router not whitelisted");
        require(amountIn > 0, "KFC: zero amountIn");

        // Snapshot balances before the swap.
        uint256 balInBefore  = IERC20(tokenIn).balanceOf(address(this));
        uint256 balOutBefore = IERC20(tokenOut).balanceOf(address(this));

        require(balInBefore >= amountIn, "KFC: insufficient tokenIn balance");

        // Approve the exact amount — increases allowance safely.
        IERC20(tokenIn).safeIncreaseAllowance(router, amountIn);

        // Execute the swap via low-level call.
        (bool success, ) = router.call(swapData);
        require(success, "KFC: swap call failed");

        // Reset residual allowance to prevent "allowance griefing."
        uint256 residualAllowance = IERC20(tokenIn).allowance(address(this), router);
        if (residualAllowance > 0) {
            IERC20(tokenIn).safeDecreaseAllowance(router, residualAllowance);
        }

        // Verify balance invariants.
        uint256 balInAfter  = IERC20(tokenIn).balanceOf(address(this));
        uint256 balOutAfter = IERC20(tokenOut).balanceOf(address(this));

        require(balInBefore - balInAfter <= amountIn, "KFC: tokenIn over-spent");

        uint256 amountOut = balOutAfter - balOutBefore;
        require(amountOut >= minAmountOut, "KFC: insufficient output");

        emit Rebalanced(tokenIn, tokenOut, amountIn, amountOut);
    }

    // ── Core Strategy: Merchant Moe Auto-Compound ─────────────────────────────

    /**
     * @notice Claims MOE rewards from a staking/farm contract and zaps them
     *         back into the principal LP position in a single atomic call.
     *
     * @param stakingPool   Address of the Merchant Moe staking/farm contract.
     * @param harvestData   ABI-encoded `claim()` calldata for the staking pool.
     * @param zapRouter     The whitelisted zapper or LB router to call.
     * @param zapData       ABI-encoded calldata for the zap call.
     * @param zapValue      Native MNT value to send with `zapData` (0 if ERC-20 only).
     *
     * Security: `zapRouter` must be in `whitelistedRouters`.
     */
    function autoCompoundMoe(
        address stakingPool,
        bytes calldata harvestData,
        address zapRouter,
        bytes calldata zapData,
        uint256 zapValue
    ) external onlyExecutorOrOwner {
        require(whitelistedRouters[zapRouter], "KFC: zap router not whitelisted");

        // Step 1 — Claim pending MOE rewards.
        (bool harvestOk, ) = stakingPool.call(harvestData);
        require(harvestOk, "KFC: harvest failed");

        // Step 2 — Zap rewards back into the LP position.
        (bool zapOk, ) = zapRouter.call{value: zapValue}(zapData);
        require(zapOk, "KFC: zap failed");

        emit AutoCompounded(stakingPool, block.timestamp);
    }

    // ── Withdrawals (onlyOwner) ───────────────────────────────────────────────

    /// @notice Withdraw any ERC-20 token held by this contract to the owner.
    function withdrawERC20(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
        emit WithdrewERC20(token, amount);
    }

    /// @notice Withdraw an ERC-1155 token (e.g. Merchant Moe LP) to the owner.
    function withdrawERC1155(
        address token,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external onlyOwner {
        IERC1155(token).safeTransferFrom(address(this), owner(), id, amount, data);
        emit WithdrewERC1155(token, id, amount);
    }

    /// @notice Withdraw native MNT to the owner.
    function withdrawNative(uint256 amount) external onlyOwner {
        (bool ok, ) = owner().call{value: amount}("");
        require(ok, "KFC: native withdraw failed");
        emit WithdrewNative(amount);
    }

    // ── ERC-1155 Receiver ─────────────────────────────────────────────────────
    // Required to receive Merchant Moe LB V2.2 ERC-1155 LP tokens.

    function onERC1155Received(
        address, address, uint256, uint256, bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address, address, uint256[] calldata, uint256[] calldata, bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId)
        public pure override(IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    // ── Native receive ────────────────────────────────────────────────────────
    receive() external payable {}
}
