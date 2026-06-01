from pydantic import BaseModel
from typing import Dict, Any

class LendingPosition(BaseModel):
    supplied_fbtc: int
    borrowed_usdc: int
    fbtc_price_usd: int
    unharvested_rewards_usdc: int

class FlywheelSignal(BaseModel):
    action_required: str  # "RESCUE", "COMPOUND", "NONE"
    metadata: Dict[str, Any]

class LTVMonitor:
    def __init__(self, logger):
        self.logger = logger
        self.MAX_LTV = 0.80
        self.RESCUE_TARGET_LTV = 0.70

    def evaluate_position(self, position_dict: dict) -> FlywheelSignal:
        supplied_fbtc = position_dict.get("supplied_fbtc", 0)
        borrowed_usdc = position_dict.get("borrowed_usdc", 0)
        fbtc_price = position_dict.get("fbtc_price_usd", 0)
        unharvested = position_dict.get("unharvested_rewards_usdc", 0)

        supplied_usd = (supplied_fbtc * fbtc_price) / 1e18
        
        if supplied_usd == 0:
            return FlywheelSignal(action_required="NONE", metadata={})

        ltv = borrowed_usdc / supplied_usd
        self.logger.log_info(
            component="ltv_monitor",
            action="evaluate_position",
            description=f"Current LTV evaluated at {ltv*100:.2f}% (Supplied: ${supplied_usd:.2f}, Borrowed: ${borrowed_usdc:.2f})",
            metadata={"ltv": ltv}
        )

        # 1. RESCUE logic: LTV exceeds 80%
        if ltv >= self.MAX_LTV:
            target_debt = supplied_usd * self.RESCUE_TARGET_LTV
            repay_amount = borrowed_usdc - target_debt
            
            self.logger.log_warn(
                component="ltv_monitor",
                action="rescue_signal_emitted",
                description=f"CRITICAL: LTV {ltv*100:.2f}% exceeds {self.MAX_LTV*100:.2f}% threshold! Emitting RESCUE signal to repay ${repay_amount:.2f}.",
                metadata={"repayment_needed_usd": repay_amount}
            )
            return FlywheelSignal(action_required="RESCUE", metadata={"repayment_needed_usd": repay_amount})
        
        # 2. COMPOUND logic: We have unharvested rewards and are healthy
        if unharvested > 0:
            self.logger.log_info(
                component="ltv_monitor",
                action="compound_signal_emitted",
                description=f"Healthy LTV ({ltv*100:.2f}%). Unharvested rewards detected. Emitting COMPOUND signal.",
                metadata={"harvestable_rewards_usd": unharvested}
            )
            return FlywheelSignal(action_required="COMPOUND", metadata={"harvestable_rewards_usd": unharvested})

        # 3. NONE logic: Healthy and no rewards
        return FlywheelSignal(action_required="NONE", metadata={})
