"""
---
skill_name: "arbitrage"
description: >
  Stochastic Blue-Chip Predator: monitors live price divergence between two DEX
  pools for volatile assets (WMETH/FBTC) and executes a two-phase arbitrage
  strategy governed by the Friction Gatekeeper.
intent_trigger_keywords: ["arbitrage", "spread", "volatile", "wmeth", "fbtc", "flash"]
whitelisted_assets: ["WMETH", "FBTC"]
execution_phases:
  - phase_1: "Micro-Capital Bootstrapper (wallet_usdc < $250) — Spot only, Gas Shield active"
  - phase_2: "Flash Loan Transition (wallet_usdc >= $250) — Tier 1 flash loans unlocked"
---
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from enum import Enum
from typing import Dict, Any, Optional

from pydantic import BaseModel, Field, field_validator

from skills.base import BaseSkill
from core.execution.cli_wrapper import ExecutionResult
from core.execution.onchain_client import OnChainClient


# ---------------------------------------------------------------------------
# Constants — all sentinel values are explicitly named for telemetry clarity
# ---------------------------------------------------------------------------

MICRO_CAP_THRESHOLD_USD: float = 250.0       # Balance below this → Phase 1
AMM_LP_FEE_RATE: float = 0.003               # 0.30% Uniswap V3 LP fee
GAS_COST_USD: float = 0.15                   # Estimated Mantle L2 flat gas cost (USD)
GAS_SHIELD_RATIO: float = 0.50               # Block trade if gas > 50% of gross profit
FLASH_PREMIUM_RATE: float = 0.0009          # 0.09% Aave-style flash loan fee
FLASH_LEVERAGE_MULTIPLIER: float = 40.0     # Max borrow = wallet_balance * 40x
FLASH_MAX_BORROW_USD: float = 10_000.0      # Tier 1 flash loan ceiling ($10,000)
FLASH_MIN_BORROW_USD: float = 1_000.0       # Tier 1 flash loan floor ($1,000)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ExecutionRoute(str, Enum):
    SPOT_EXECUTION  = "SPOT_EXECUTION"
    FLASH_EXECUTION = "FLASH_EXECUTION"
    BLOCKED         = "BLOCKED"


class BlockReason(str, Enum):
    GAS_SHIELD_TRIGGERED = "GAS_SHIELD_TRIGGERED"
    NAP_NEGATIVE         = "NAP_NEGATIVE"
    SPREAD_TOO_THIN      = "SPREAD_TOO_THIN"
    NONE                 = "NONE"


# ---------------------------------------------------------------------------
# Pydantic Input Model
# ---------------------------------------------------------------------------

class ArbitrageParams(BaseModel):
    """
    Validated input payload for the VolatileArbitrageSkill.

    Attributes:
        target_asset:        Volatile asset to monitor ('WMETH' or 'FBTC').
        wallet_usdc_balance: Current wallet USDC balance in USD.
        target_spread_pct:   Minimum observed spread % required to consider a trade.
        capital_amount:      USD principal to deploy for spot execution (Phase 1).
        identity:            Owner wallet address (ERC-8004 Identity).
    """
    target_asset: str = Field(
        default="WMETH",
        description="Volatile asset pair to monitor (WMETH or FBTC).",
    )
    wallet_usdc_balance: float = Field(
        default=100.0,
        ge=0.0,
        description="Current USDC wallet balance in USD.",
    )
    target_spread_pct: float = Field(
        default=0.50,
        gt=0.0,
        description="Minimum spread percentage threshold to trigger evaluation (e.g., 0.5 = 0.5%).",
    )
    capital_amount: float = Field(
        default=100.0,
        gt=0.0,
        description="USD principal to deploy in Phase 1 spot execution.",
    )
    identity: str = Field(
        default="0x0529E64CB29388df0312000000021bc08910E64C",
        description="Owner ERC-8004 wallet address.",
    )

    @field_validator("target_asset")
    @classmethod
    def validate_volatile_asset(cls, v: str) -> str:
        allowed = {"WMETH", "FBTC"}
        if v.upper() not in allowed:
            raise ValueError(
                f"Asset '{v}' is outside the volatile arbitrage scope. "
                f"Allowed: {sorted(allowed)}"
            )
        return v.upper()


# ---------------------------------------------------------------------------
# Gatekeeper Result
# ---------------------------------------------------------------------------

@dataclass
class GatekeeperResult:
    """
    The structured output of evaluate_arbitrage_opportunity().

    Attributes:
        route:            Approved execution route (SPOT, FLASH, or BLOCKED).
        phase:            1 (Micro-Cap Bootstrapper) or 2 (Flash Loan Transition).
        nap_usd:          Net Arbitrage Profitability in USD after all friction costs.
        gross_profit_usd: Pre-friction gross profit.
        gas_cost_usd:     Estimated L2 gas cost in USD.
        amm_fee_usd:      AMM LP fee deducted.
        flash_premium_usd: Flash loan premium (Phase 2 only; 0.0 in Phase 1).
        capital_deployed: Actual USD principal used for the calculation.
        block_reason:     Why the trade was blocked (if applicable).
    """
    route: ExecutionRoute
    phase: int
    nap_usd: float
    gross_profit_usd: float
    gas_cost_usd: float
    amm_fee_usd: float
    flash_premium_usd: float
    capital_deployed: float
    block_reason: BlockReason


# ---------------------------------------------------------------------------
# The Friction Gatekeeper
# ---------------------------------------------------------------------------

def evaluate_arbitrage_opportunity(
    params: ArbitrageParams,
    live_spread_pct: float,
    logger: Any,
) -> GatekeeperResult:
    """
    The Friction Gatekeeper: stateless, pure-math evaluation of whether a live
    spread is profitable after deducting all friction costs.

    Phase selection is determined exclusively by ``params.wallet_usdc_balance``:

    Phase 1 — Micro-Capital Bootstrapper (balance < $250):
        Flash loans are DISABLED. Only spot capital is used.

        Friction model:
            gross_spot_profit = capital_amount * (live_spread_pct / 100)
            amm_fee           = capital_amount * AMM_LP_FEE_RATE
            gas_cost          = GAS_COST_USD (flat L2 estimate)
            NAP               = gross_spot_profit - amm_fee - gas_cost

        Gas Shield: BLOCK if gas_cost > gross_spot_profit * GAS_SHIELD_RATIO
        Execution:  SPOT_EXECUTION if NAP > 0

    Phase 2 — Flash Loan Transition (balance >= $250):
        Flash loans ENABLED. Borrowed capital amplifies the trade.

        Flash principal:
            flash_principal = clamp(
                wallet_usdc_balance * FLASH_LEVERAGE_MULTIPLIER,
                FLASH_MIN_BORROW_USD,
                FLASH_MAX_BORROW_USD,
            )

        Friction model:
            gross_flash_profit = flash_principal * (live_spread_pct / 100)
            flash_premium      = flash_principal * FLASH_PREMIUM_RATE
            amm_fee            = flash_principal * AMM_LP_FEE_RATE
            gas_cost           = GAS_COST_USD
            NAP                = gross_flash_profit - flash_premium - amm_fee - gas_cost

        SNR Gate: BLOCK if NAP <= 0
        Execution: FLASH_EXECUTION if NAP > 0

    Args:
        params:          Validated ArbitrageParams instance.
        live_spread_pct: Real-time percentage divergence from OnChainClient.

    Returns:
        GatekeeperResult with the approved route and full cost breakdown.
    """
    balance: float = params.wallet_usdc_balance

    # ── Phase selection ────────────────────────────────────────────────────
    if balance < MICRO_CAP_THRESHOLD_USD:
        phase: int = 1
        capital: float = params.capital_amount

        gross_profit: float  = capital * (live_spread_pct / 100.0)
        amm_fee: float       = capital * AMM_LP_FEE_RATE
        gas_cost: float      = GAS_COST_USD
        flash_premium: float = 0.0
        nap: float           = gross_profit - amm_fee - gas_cost

        # ── Gas Shield check ───────────────────────────────────────────────
        if gas_cost > gross_profit * GAS_SHIELD_RATIO:
            logger.log_warn(
                "friction_gatekeeper",
                "gas_shield_triggered",
                (
                    f"[{params.target_asset}] GAS SHIELD ACTIVATED. "
                    f"Gas (${gas_cost:.4f}) exceeds {GAS_SHIELD_RATIO*100:.0f}% "
                    f"of gross profit (${gross_profit:.4f}). Blocking trade."
                ),
                metadata={
                    "phase": phase,
                    "token": params.target_asset,
                    "live_spread_pct": live_spread_pct,
                    "gross_profit_usd": gross_profit,
                    "gas_cost_usd": gas_cost,
                    "gas_shield_ratio": GAS_SHIELD_RATIO,
                    "capital_deployed_usd": capital,
                },
            )
            return GatekeeperResult(
                route=ExecutionRoute.BLOCKED,
                phase=phase,
                nap_usd=nap,
                gross_profit_usd=gross_profit,
                gas_cost_usd=gas_cost,
                amm_fee_usd=amm_fee,
                flash_premium_usd=flash_premium,
                capital_deployed=capital,
                block_reason=BlockReason.GAS_SHIELD_TRIGGERED,
            )

        # ── NAP check ──────────────────────────────────────────────────────
        if nap <= 0.0:
            logger.log_warn(
                "friction_gatekeeper",
                "nap_negative_phase1",
                (
                    f"[{params.target_asset}] Phase 1 NAP check FAILED. "
                    f"NAP=${nap:.4f} after AMM fees and gas. Trade blocked."
                ),
                metadata={
                    "phase": phase,
                    "token": params.target_asset,
                    "live_spread_pct": live_spread_pct,
                    "gross_profit_usd": gross_profit,
                    "amm_fee_usd": amm_fee,
                    "gas_cost_usd": gas_cost,
                    "nap_usd": nap,
                },
            )
            return GatekeeperResult(
                route=ExecutionRoute.BLOCKED,
                phase=phase,
                nap_usd=nap,
                gross_profit_usd=gross_profit,
                gas_cost_usd=gas_cost,
                amm_fee_usd=amm_fee,
                flash_premium_usd=flash_premium,
                capital_deployed=capital,
                block_reason=BlockReason.NAP_NEGATIVE,
            )

        # ── Phase 1 approved ───────────────────────────────────────────────
        logger.log_success(
            "friction_gatekeeper",
            "phase1_spot_approved",
            (
                f"[{params.target_asset}] Phase 1 SPOT APPROVED. "
                f"Spread={live_spread_pct:.4f}% | "
                f"Gross=${gross_profit:.4f} | "
                f"AMM Fee=${amm_fee:.4f} | "
                f"Gas=${gas_cost:.4f} | "
                f"NAP=${nap:.4f}"
            ),
            metadata={
                "phase": phase,
                "token": params.target_asset,
                "route": ExecutionRoute.SPOT_EXECUTION,
                "live_spread_pct": live_spread_pct,
                "capital_deployed_usd": capital,
                "gross_profit_usd": gross_profit,
                "amm_fee_usd": amm_fee,
                "gas_cost_usd": gas_cost,
                "nap_usd": nap,
            },
        )
        return GatekeeperResult(
            route=ExecutionRoute.SPOT_EXECUTION,
            phase=phase,
            nap_usd=nap,
            gross_profit_usd=gross_profit,
            gas_cost_usd=gas_cost,
            amm_fee_usd=amm_fee,
            flash_premium_usd=flash_premium,
            capital_deployed=capital,
            block_reason=BlockReason.NONE,
        )

    else:
        # ── Phase 2 — Flash Loan Transition ────────────────────────────────
        phase = 2

        # Milestone unlock telemetry event
        logger.log_success(
            "friction_gatekeeper",
            "flash_loan_milestone_unlocked",
            (
                f"[{params.target_asset}] MILESTONE UNLOCKED: Wallet balance "
                f"${balance:.2f} >= ${MICRO_CAP_THRESHOLD_USD:.2f} threshold. "
                f"Tier 1 Flash Loans enabled."
            ),
            metadata={
                "phase": phase,
                "token": params.target_asset,
                "wallet_usdc_balance": balance,
                "milestone_threshold": MICRO_CAP_THRESHOLD_USD,
                "flash_min_usd": FLASH_MIN_BORROW_USD,
                "flash_max_usd": FLASH_MAX_BORROW_USD,
            },
        )

        # Compute flash principal (clamped to Tier 1 bounds)
        raw_borrow: float = balance * FLASH_LEVERAGE_MULTIPLIER
        capital = max(FLASH_MIN_BORROW_USD, min(raw_borrow, FLASH_MAX_BORROW_USD))

        gross_profit  = capital * (live_spread_pct / 100.0)
        flash_premium = capital * FLASH_PREMIUM_RATE
        amm_fee       = capital * AMM_LP_FEE_RATE
        gas_cost      = GAS_COST_USD
        nap           = gross_profit - flash_premium - amm_fee - gas_cost

        # ── SNR Gate check ─────────────────────────────────────────────────
        if nap <= 0.0:
            logger.log_warn(
                "friction_gatekeeper",
                "snr_gate_blocked_phase2",
                (
                    f"[{params.target_asset}] Phase 2 SNR Gate BLOCKED. "
                    f"Spread too thin to cover flash premium + AMM fees + gas. "
                    f"NAP=${nap:.4f}. Borrow=${capital:.2f}."
                ),
                metadata={
                    "phase": phase,
                    "token": params.target_asset,
                    "live_spread_pct": live_spread_pct,
                    "flash_principal_usd": capital,
                    "gross_profit_usd": gross_profit,
                    "flash_premium_usd": flash_premium,
                    "amm_fee_usd": amm_fee,
                    "gas_cost_usd": gas_cost,
                    "nap_usd": nap,
                },
            )
            return GatekeeperResult(
                route=ExecutionRoute.BLOCKED,
                phase=phase,
                nap_usd=nap,
                gross_profit_usd=gross_profit,
                gas_cost_usd=gas_cost,
                amm_fee_usd=amm_fee,
                flash_premium_usd=flash_premium,
                capital_deployed=capital,
                block_reason=BlockReason.NAP_NEGATIVE,
            )

        # ── Phase 2 approved ───────────────────────────────────────────────
        logger.log_success(
            "friction_gatekeeper",
            "phase2_flash_approved",
            (
                f"[{params.target_asset}] Phase 2 FLASH APPROVED. "
                f"Borrow=${capital:.2f} | "
                f"Spread={live_spread_pct:.4f}% | "
                f"Gross=${gross_profit:.4f} | "
                f"Flash Premium=${flash_premium:.4f} | "
                f"AMM Fee=${amm_fee:.4f} | "
                f"Gas=${gas_cost:.4f} | "
                f"NAP=${nap:.4f}"
            ),
            metadata={
                "phase": phase,
                "token": params.target_asset,
                "route": ExecutionRoute.FLASH_EXECUTION,
                "live_spread_pct": live_spread_pct,
                "flash_principal_usd": capital,
                "gross_profit_usd": gross_profit,
                "flash_premium_usd": flash_premium,
                "amm_fee_usd": amm_fee,
                "gas_cost_usd": gas_cost,
                "nap_usd": nap,
            },
        )
        return GatekeeperResult(
            route=ExecutionRoute.FLASH_EXECUTION,
            phase=phase,
            nap_usd=nap,
            gross_profit_usd=gross_profit,
            gas_cost_usd=gas_cost,
            amm_fee_usd=amm_fee,
            flash_premium_usd=flash_premium,
            capital_deployed=capital,
            block_reason=BlockReason.NONE,
        )


# ---------------------------------------------------------------------------
# Skill Class
# ---------------------------------------------------------------------------

class VolatileArbitrageSkill(BaseSkill):
    """
    KinetiFi Stochastic Blue-Chip Predator — the live volatile arbitrage skill.

    Lifecycle:
        1. validate_preflight()  — Fetches live USDC balance and spread from
                                   OnChainClient, then runs the Friction Gatekeeper.
        2. execute()             — Routes to SPOT_EXECUTION or FLASH_EXECUTION
                                   based on the GatekeeperResult.
    """

    def __init__(self, cli_wrapper: Any, logger: Any, onchain_client: OnChainClient) -> None:
        super().__init__()
        self.cli_wrapper = cli_wrapper
        self.logger = logger
        self.onchain_client = onchain_client

    @property
    def name(self) -> str:
        return "volatile_arbitrage"

    @property
    def description(self) -> str:
        return (
            "Monitors live WMETH/FBTC price divergence across Agni Finance and Merchant Moe "
            "pools and executes Micro-Capital (spot) or Flash Loan arbitrage trades "
            "after passing the Friction Gatekeeper."
        )

    async def validate_preflight(
        self,
        params: Dict[str, Any],
    ) -> Optional[GatekeeperResult]:
        """
        Fetches live on-chain state and runs the Friction Gatekeeper.

        Returns:
            GatekeeperResult if the opportunity passes (route != BLOCKED), else None.
        """
        try:
            p = ArbitrageParams(**params)

            self.logger.log_info(
                "volatile_arbitrage",
                "validate_preflight_start",
                f"Starting volatile arb pre-flight for {p.target_asset}.",
                metadata={"token": p.target_asset, "identity": p.identity},
            )

            # 1. Live spread from dual DEX pools
            live_spread_pct: float = await self.onchain_client.get_live_spread(p.target_asset)

            # 2. Live USDC balance (override params with on-chain truth)
            live_usdc_balance: float = await self.onchain_client.get_erc20_balance(
                "USDC", p.identity
            )
            p = p.model_copy(update={"wallet_usdc_balance": live_usdc_balance})

            self.logger.log_info(
                "volatile_arbitrage",
                "onchain_state_fetched",
                (
                    f"[{p.target_asset}] Live state: "
                    f"Spread={live_spread_pct:.4f}% | "
                    f"USDC Balance=${live_usdc_balance:.2f}"
                ),
                metadata={
                    "token": p.target_asset,
                    "live_spread_pct": live_spread_pct,
                    "live_usdc_balance": live_usdc_balance,
                },
            )

            # 3. Friction Gatekeeper
            result: GatekeeperResult = evaluate_arbitrage_opportunity(p, live_spread_pct, self.logger)

            if result.route == ExecutionRoute.BLOCKED:
                self.logger.log_warn(
                    "volatile_arbitrage",
                    "preflight_blocked",
                    f"[{p.target_asset}] Pre-flight BLOCKED: {result.block_reason.value}.",
                    metadata={
                        "token": p.target_asset,
                        "block_reason": result.block_reason.value,
                        "nap_usd": result.nap_usd,
                    },
                )
                return None

            return result

        except Exception as e:
            # We assume logger might also have a log_error, but if not we can use log_warn.
            # Using log_warn since we only have success, warn, info mentioned explicitly.
            # Wait, the spec only explicitly mentioned log_warn, log_info, log_success.
            self.logger.log_warn(
                "volatile_arbitrage",
                "validate_preflight_crash",
                f"Pre-flight crashed with unhandled exception: {e}",
                metadata={},
            )
            return None

    async def execute(self, payload: dict) -> ExecutionResult:
        """
        Main execution entry point. Runs pre-flight validation,
        then routes to the appropriate execution path using the payload directly.
        """
        t_start: float = time.monotonic()

        step_params = payload
        result: Optional[GatekeeperResult] = await self.validate_preflight(step_params)

        if result is None:
            latency_ms: float = (time.monotonic() - t_start) * 1000.0
            return ExecutionResult(
                stdout="",
                stderr="Volatile arbitrage pre-flight validation failed or trade blocked.",
                returncode=1,
                latency_ms=latency_ms,
            )

        p = ArbitrageParams(**step_params)

        # ── Route: Phase 1 Spot ────────────────────────────────────────────
        if result.route == ExecutionRoute.SPOT_EXECUTION:
            args = [
                "swap",
                "--from", "USDC",
                "--to", p.target_asset,
                "--amount", str(result.capital_deployed),
                "--identity", p.identity,
            ]
            self.logger.log_info(
                "volatile_arbitrage",
                "routing_spot_execution",
                (
                    f"[{p.target_asset}] Routing Phase 1 SPOT swap: "
                    f"${result.capital_deployed:.2f} USDC → {p.target_asset}. "
                    f"Expected NAP: ${result.nap_usd:.4f}."
                ),
                metadata={
                    "route": result.route.value,
                    "phase": result.phase,
                    "capital_usd": result.capital_deployed,
                    "nap_usd": result.nap_usd,
                },
            )
            try:
                return await self.cli_wrapper.run_byreal_cli(args)
            except Exception as e:
                self.logger.log_warn(
                    "volatile_arbitrage", "spot_execution_crash",
                    f"Spot execution fatal crash: {e}", metadata={}
                )
                latency_ms = (time.monotonic() - t_start) * 1000.0
                return ExecutionResult(
                    stdout="", stderr=f"Spot execution crash: {e}",
                    returncode=1, latency_ms=latency_ms,
                )

        # ── Route: Phase 2 Flash Loan ──────────────────────────────────────
        elif result.route == ExecutionRoute.FLASH_EXECUTION:
            self.logger.log_info(
                "volatile_arbitrage",
                "routing_flash_execution",
                (
                    f"[{p.target_asset}] Routing Phase 2 FLASH LOAN: "
                    f"Borrow=${result.capital_deployed:.2f} | "
                    f"Flash Premium=${result.flash_premium_usd:.4f} | "
                    f"Expected NAP: ${result.nap_usd:.4f}."
                ),
                metadata={
                    "route": result.route.value,
                    "phase": result.phase,
                    "flash_principal_usd": result.capital_deployed,
                    "flash_premium_usd": result.flash_premium_usd,
                    "nap_usd": result.nap_usd,
                },
            )
            # Stubbed execution via CLI until provider is selected
            args = [
                "flash-arb",
                "--asset", p.target_asset,
                "--borrow", str(result.capital_deployed),
                "--identity", p.identity,
            ]
            try:
                return await self.cli_wrapper.run_byreal_cli(args)
            except Exception as e:
                self.logger.log_warn(
                    "volatile_arbitrage", "flash_execution_crash",
                    f"Flash loan execution fatal crash: {e}", metadata={}
                )
                latency_ms = (time.monotonic() - t_start) * 1000.0
                return ExecutionResult(
                    stdout="", stderr=f"Flash execution crash: {e}",
                    returncode=1, latency_ms=latency_ms,
                )

        # Should never reach here — defensive fallback
        latency_ms = (time.monotonic() - t_start) * 1000.0
        return ExecutionResult(
            stdout="", stderr="Unknown execution route — no action taken.",
            returncode=1, latency_ms=latency_ms,
        )
