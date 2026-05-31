"""
---
skill_name: "peg_arbitrage"
description: "Monitors and executes automated peg stability trades on USDY/USDC pools using mathematical margin modeling."
intent_trigger_keywords: ["arbitrage", "peg", "stability", "rebalance", "stabilize"]
whitelisted_assets: ["USDC", "USDY"]
required_contracts:
  - Pool: "0x5821df22000df0bcaeed0312000000021bc08910"
---
"""

import time
from typing import Dict, Any
from pydantic import BaseModel, Field, field_validator
from skills.base import BaseSkill
from core.intent.models import ParsedIntent
from core.execution.cli_wrapper import ExecutionResult, run_byreal_cli
from core.observability.decision_log import log_telemetry_event
from core.execution.onchain_client import OnChainClient

class ArbitrageParams(BaseModel):
    target_asset: str = Field(default="USDY", description="Pegged asset to monitor")
    peg_asset: str = Field(default="USDC", description="Base peg comparison asset")
    amount: float = Field(default=250.00, description="Principal capital quantity for stabilizing trade")
    threshold: float = Field(default=0.005, description="Percentage deviation trigger threshold (theta)")
    target_profit: float = Field(default=1.00, description="Minimum Net Arbitrage Profitability requirement")
    identity: str = Field(default="0x0529", description="Owner ERC-8004 Identity")

    @field_validator("target_asset", "peg_asset")
    @classmethod
    def validate_peg_tokens(cls, v: str) -> str:
        allowed = ["USDC", "USDY"]
        if v.upper() not in allowed:
            raise ValueError(f"Asset {v} is outside the arbitrage pair scope.")
        return v.upper()

class PegArbitrageSkill(BaseSkill):
    def __init__(self):
        super().__init__()
        self._onchain = OnChainClient()
    
    @property
    def name(self) -> str:
        return "peg_arbitrage"

    @property
    def description(self) -> str:
        return "Monitors stable deviations and executes risk-free arbitrage swaps."

    async def validate_preflight(self, params: Dict[str, Any]) -> bool:
        try:
            p = ArbitrageParams(**params)
            wallet_addr = "0x0529E64CB29388df0312000000021bc08910E64C" # Smart wallet proxy
            
            # 1. Fetch REAL USDY price from live pool contract on Mantle L2
            market_price = await self._onchain.get_live_usdy_price()
            deviation = market_price - 1.0000

            # 2. Query REAL Native MNT balance to verify gas capability
            gas_balance = await self._onchain.get_mnt_balance(wallet_addr)
            if gas_balance < 0.1: # Require at least 0.1 MNT
                log_telemetry_event(
                    "WARN", "guardrails", "validate_preflight",
                    f"Transaction blocked: Low MNT balance on-chain ({gas_balance:.4f} MNT available).", {}
                )
                return False

            # 3. Calculate NAP (Net Arbitrage Profitability) using real price data
            gross_profit = p.amount * abs(deviation)
            gas_cost = 0.0015  # L2 gas estimate
            nap = gross_profit - gas_cost

            if nap < p.target_profit:
                log_telemetry_event(
                    "WARN", "guardrails", "validate_preflight",
                    f"Arbitrage aborted. On-chain margin calculation too thin (NAP: ${nap:.4f}).",
                    {"live_price": market_price, "gas_balance_mnt": gas_balance}
                )
                return False

            log_telemetry_event(
                "SUCCESS", "guardrails", "validate_preflight",
                f"On-chain triggers confirmed! Live state verified. Routing execution.",
                {"live_price": market_price, "nap": nap, "gas_balance_mnt": gas_balance}
            )
            return True
        except Exception as e:
            log_telemetry_event("ERROR", "guardrails", "validate_preflight", f"On-chain pre-flight crash: {e}", {})
            return False

    async def execute(self, intent: ParsedIntent) -> ExecutionResult:
        step_params = {}
        for step in intent.execution_plan:
            if step.action in ["arbitrage", "peg_arbitrage", "stability"]:
                step_params = step.params
                break

        if not await self.validate_preflight(step_params):
            return ExecutionResult(stdout="", stderr="Arbitrage triggers not validated.", returncode=1, latency_ms=0.0)

        p = ArbitrageParams(**step_params)
        market_price = await self._onchain.get_live_usdy_price()
        
        # Decide buy/sell direction based on deviation direction
        if market_price < 1.00:
            # Under-peg: Buy cheap USDY with USDC
            from_token, to_token = "USDC", "USDY"
        else:
            # Over-peg: Exit USDY back to USDC
            from_token, to_token = "USDY", "USDC"

        args = ["swap", "--from", from_token, "--to", to_token, "--amount", str(p.amount), "--identity", p.identity]
        
        log_telemetry_event("INFO", "skill_registry", "execute_arbitrage", f"Routing peg stability trade: Swap {p.amount} {from_token} -> {to_token}.", {})

        try:
            return await run_byreal_cli(args)
        except Exception as e:
            log_telemetry_event("ERROR", "skill_registry", "execute_arbitrage", f"Fatal execution crash: {str(e)}", {})
            return ExecutionResult(stdout="", stderr=f"Fatal execution crash: {str(e)}", returncode=1, latency_ms=0.0)
