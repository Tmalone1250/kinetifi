from typing import Dict, Any
from pydantic import BaseModel
from core.observability.decision_log import TelemetryLogger
from core.execution.onchain_client import OnChainClient
from core.execution.ltv_monitor import FlywheelSignal

class ExecutionResult(BaseModel):
    success: bool
    action: str
    tx_hash: str | None
    error_message: str | None

class FlywheelManagerSkill:
    """Executes atomic Treasury Flywheel smart contract actions."""
    
    def __init__(self, cli_wrapper: Any, logger: TelemetryLogger, onchain_client: OnChainClient):
        self.cli = cli_wrapper
        self.logger = logger
        self.onchain = onchain_client

    async def execute(self, signal: FlywheelSignal) -> ExecutionResult:
        """Processes the LTV Monitor signal and executes the on-chain transaction."""
        
        if signal.action_required == "RESCUE":
            repay_amount = signal.metadata.get("repayment_needed_usd", 0.0)
            
            self.logger.log_info(
                component="flywheel_skill",
                action="formulating_rescue",
                description=f"Preparing atomic LP unwind and {repay_amount:.2f} USDC debt repayment.",
                metadata={}
            )
            
            # Construct the execution payload for the CLI wrapper
            payload = {
                "contract_action": "rebalanceDebt",
                "target_ltv_repayment": repay_amount,
                "asset": "USDC"
            }
            
            result = await self.cli.execute_action("flywheel_rescue", payload)
            
            if result.get("status") == "success":
                self.logger.log_success(
                    "flywheel_skill", "rescue_executed", "Successfully unwound LP and repaid debt.", 
                    metadata={"tx_hash": result.get("tx_hash")}
                )
                return ExecutionResult(success=True, action="RESCUE", tx_hash=result.get("tx_hash"), error_message=None)
            else:
                return ExecutionResult(success=False, action="RESCUE", tx_hash=None, error_message="CLI Execution Failed")

        elif signal.action_required == "COMPOUND":
            harvest_amount = signal.metadata.get("harvestable_rewards_usd", 0.0)
            
            self.logger.log_info(
                component="flywheel_skill",
                action="formulating_compound",
                description=f"Preparing to harvest {harvest_amount:.2f} USD in LP fees and re-supply as FBTC.",
                metadata={}
            )
            
            payload = {
                "contract_action": "compoundFlywheel",
                "expected_minimum_fbtc": 0.0  # In production, calculated via OnChainClient spread
            }
            
            result = await self.cli.execute_action("flywheel_compound", payload)
            
            if result.get("status") == "success":
                self.logger.log_success(
                    "flywheel_skill", "compound_executed", "Successfully compounded LP fees into Treasury.", 
                    metadata={"tx_hash": result.get("tx_hash")}
                )
                return ExecutionResult(success=True, action="COMPOUND", tx_hash=result.get("tx_hash"), error_message=None)
            else:
                return ExecutionResult(success=False, action="COMPOUND", tx_hash=None, error_message="CLI Execution Failed")
                
        return ExecutionResult(success=False, action="UNKNOWN", tx_hash=None, error_message="Invalid action required.")
