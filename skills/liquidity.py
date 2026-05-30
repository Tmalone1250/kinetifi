"""
---
skill_name: "manage_liquidity"
description: "Asynchronously manages concentrated liquidity pools on Mantle via the byreal-cli wrapper."
intent_trigger_keywords: ["deposit", "provide", "lp", "add liquidity", "remove liquidity", "withdraw liquidity"]
whitelisted_assets: ["WMETH", "USDC", "MNT", "USDY"]
required_contracts:
  - NonfungiblePositionManager: "0x25b4123000df0bcaeed0312000000021bc08910"
---
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator
from skills.base import BaseSkill
from core.intent.models import ParsedIntent
from core.execution.cli_wrapper import ExecutionResult, run_byreal_cli
from core.observability.decision_log import log_telemetry_event

class LiquidityParams(BaseModel):
    action: str = Field(..., description="'add' or 'remove'")
    token_a: Optional[str] = Field(None, description="First token symbol")
    token_b: Optional[str] = Field(None, description="Second token symbol")
    amount_a: Optional[float] = Field(None, description="Amount of token A")
    amount_b: Optional[float] = Field(None, description="Amount of token B")
    lower_tick: Optional[int] = Field(None, description="Lower concentrated price boundary tick")
    upper_tick: Optional[int] = Field(None, description="Upper concentrated price boundary tick")
    token_id: Optional[int] = Field(None, description="NFT position ID required for removal")
    identity: str = Field(default="0x0529", description="Owner ERC-8004 Identity")

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        if v.lower() not in ["add", "remove"]:
            raise ValueError("Action must be either 'add' or 'remove'.")
        return v.lower()
        
    @field_validator("token_a", "token_b")
    @classmethod
    def check_whitelist(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        whitelist = ["MNT", "WMETH", "USDC", "USDY"]
        if v.upper() not in whitelist:
            raise ValueError(f"Asset {v} is not whitelisted.")
        return v.upper()

    @model_validator(mode="after")
    def verify_parameters(self) -> 'LiquidityParams':
        if self.action == "add":
            if (self.token_a is None or self.token_b is None or 
                self.amount_a is None or self.amount_b is None or 
                self.lower_tick is None or self.upper_tick is None):
                raise ValueError("Parameters token_a, token_b, amount_a, amount_b, lower_tick, and upper_tick are mandatory when action is 'add'.")
        elif self.action == "remove":
            if self.token_id is None:
                raise ValueError("token_id is mandatory when action is 'remove'.")
        return self

class LiquiditySkill(BaseSkill):
    
    @property
    def name(self) -> str:
        return "manage_liquidity"

    @property
    def description(self) -> str:
        return "Provides and withdraws concentrated liquidity from active pools."

    async def validate_preflight(self, params: Dict[str, Any]) -> bool:
        try:
            LiquidityParams(**params)
            return True
        except Exception as e:
            log_telemetry_event("ERROR", "guardrails", "validate_preflight", f"LP validation failed: {e}", {})
            return False

    async def execute(self, intent: ParsedIntent) -> ExecutionResult:
        step_params = {}
        for step in intent.execution_plan:
            if step.action in ["lp", "manage_liquidity"]:
                step_params = step.params
                break

        if not await self.validate_preflight(step_params):
            return ExecutionResult(stdout="", stderr="Validation failed.", returncode=1, latency_ms=0.0)

        p = LiquidityParams(**step_params)
        
        if p.action == "add":
            args = [
                "lp", "add",
                "--tokenA", p.token_a,
                "--tokenB", p.token_b,
                "--amountA", str(p.amount_a),
                "--amountB", str(p.amount_b),
                "--lower", str(p.lower_tick),
                "--upper", str(p.upper_tick),
                "--identity", p.identity
            ]
        else:
            args = ["lp", "remove", "--tokenId", str(p.token_id), "--identity", p.identity]

        log_telemetry_event("INFO", "skill_registry", "execute_lp", f"Executing LP {p.action} routine on Mantle.", {})
        
        try:
            return await run_byreal_cli(args)
        except Exception as e:
            log_telemetry_event("ERROR", "skill_registry", "execute_lp", f"LP {p.action} execution failed: {e}", {})
            return ExecutionResult(stdout="", stderr=f"Fatal execution crash: {str(e)}", returncode=1, latency_ms=0.0)
