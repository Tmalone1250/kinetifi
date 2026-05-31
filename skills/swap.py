"""
---
skill_name: "swap_token"
description: "Asynchronously executes automated asset-to-asset swaps via the byreal-cli wrapper."
intent_trigger_keywords: ["swap", "trade", "exchange", "convert", "buy", "sell"]
whitelisted_assets: ["WMETH", "USDC", "MNT", "USDY"]
required_contracts:
  - Router: "0x3abcf123000df0bcaeed0312000000021bc08910"
---
"""

import time
from typing import Dict, Any
from pydantic import BaseModel, Field, field_validator
from skills.base import BaseSkill
from core.intent.models import ParsedIntent
from core.execution.cli_wrapper import ExecutionResult, run_byreal_cli
from core.observability.decision_log import log_telemetry_event

class SwapSkillParams(BaseModel):
    from_token: str = Field(..., description="Source token symbol")
    to_token: str = Field(..., description="Target token symbol")
    amount: float = Field(..., description="Quantity of token to swap")
    identity: str = Field(default="0x0529", description="Owner ERC-8004 Identity")

    @field_validator("from_token", "to_token")
    @classmethod
    def check_whitelist(cls, v: str) -> str:
        whitelist = ["MNT", "WMETH", "USDC", "USDY"]
        if v.upper() not in whitelist:
            raise ValueError(f"Asset {v} is not whitelisted.")
        return v.upper()

    @field_validator("amount")
    @classmethod
    def check_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Amount must be greater than zero.")
        return v

class SwapSkill(BaseSkill):
    
    @property
    def name(self) -> str:
        return "swap_token"
        
    @property
    def description(self) -> str:
        return "Executes on-chain swaps of whitelisted tokens."

    async def validate_preflight(self, params: Dict[str, Any]) -> bool:
        try:
            SwapSkillParams(**params)
            return True
        except Exception as e:
            log_telemetry_event("ERROR", "guardrails", "validate_preflight", f"Swap validation failed: {e}", {})
            return False

    async def execute(self, intent: ParsedIntent) -> ExecutionResult:
        # Extract the params for this specific action
        step_params = {}
        for step in intent.execution_plan:
            if step.action == "swap":
                step_params = step.params
                break
                
        if not await self.validate_preflight(step_params):
            return ExecutionResult(stdout="", stderr="Validation failed.", returncode=1, latency_ms=0.0)

        p = SwapSkillParams(**step_params)
        args = ["swap", "--from", p.from_token, "--to", p.to_token, "--amount", str(p.amount), "--identity", p.identity]
        
        log_telemetry_event("INFO", "skill_registry", "execute_swap", f"Initiating swap: {p.amount} {p.from_token} -> {p.to_token}", {})
        
        try:
            return await run_byreal_cli(args)
        except Exception as e:
            log_telemetry_event("ERROR", "skill_registry", "execute_swap", f"Fatal execution crash: {str(e)}", {})
            return ExecutionResult(stdout="", stderr=f"Fatal execution crash: {str(e)}", returncode=1, latency_ms=0.0)
