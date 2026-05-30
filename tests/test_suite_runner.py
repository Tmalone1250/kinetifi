import sys
import os
import json
from datetime import datetime, timezone
import asyncio

# Step 1: Framework Setup & Imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.execution.cli_wrapper import extract_tx_hash, ExecutionResult, WhitelistError, enforce_whitelist
from core.intent.models import ParsedIntent, StepExecution
import skills.swap

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

# Step 2: Build the Local Telemetry Logger
class LocalTelemetryLogger:
    def __init__(self, filepath: str = "telemetry/event_stream.json"):
        self.filepath = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", filepath))
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)

    def log(self, level: str, component: str, action: str, description: str, metadata: dict = None):
        if metadata is None:
            metadata = {}
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level.upper(),
            "component": component,
            "action": action,
            "description": description,
            "metadata": metadata
        }
        color = Colors.ENDC
        if level.upper() == "SUCCESS":
            color = Colors.OKGREEN
        elif level.upper() == "INFO":
            color = Colors.OKCYAN
        elif level.upper() in ["WARN", "WARNING"]:
            color = Colors.WARNING
        elif level.upper() == "ERROR":
            color = Colors.FAIL
            
        print(f"{color}[{level.upper()}] [{component}] {action}: {description}{Colors.ENDC}")
        try:
            with open(self.filepath, "a") as f:
                f.write(json.dumps(event) + "\n")
        except Exception as e:
            print(f"{Colors.FAIL}FATAL: Could not write to telemetry stream: {e}{Colors.ENDC}")

    def log_info(self, component: str, action: str, description: str, metadata: dict = None):
        self.log("INFO", component, action, description, metadata)
        
    def log_success(self, component: str, action: str, description: str, metadata: dict = None):
        self.log("SUCCESS", component, action, description, metadata)
        
    def log_error(self, component: str, action: str, description: str, metadata: dict = None):
        self.log("ERROR", component, action, description, metadata)
        
    def log_warn(self, component: str, action: str, description: str, metadata: dict = None):
        self.log("WARN", component, action, description, metadata)


# Step 3: Scaffold the CLI Simulation Wrapper
class LocalCLIWrapper:
    def __init__(self):
        self.mock_price = 0.9850

    async def execute_cmd(self, args: list) -> ExecutionResult:
        if not args:
            return ExecutionResult(stdout="", stderr="No command", returncode=1, latency_ms=1.0)
            
        cmd = args[0]
        
        if cmd == "price":
            stdout = f"Price: {self.mock_price:.4f}"
            return ExecutionResult(stdout=stdout, stderr="", returncode=0, latency_ms=10.0)
            
        elif cmd == "swap":
            mock_hash = "0x" + "a" * 64
            stdout = f"Swap transaction submitted successfully. Hash: {mock_hash}"
            return ExecutionResult(stdout=stdout, stderr="", returncode=0, latency_ms=125.0, tx_hash=mock_hash)
            
        elif cmd == "lp":
            mock_hash = "0x" + "b" * 64
            stdout = f"Liquidity action submitted. Receipt Hash: {mock_hash}"
            return ExecutionResult(stdout=stdout, stderr="", returncode=0, latency_ms=210.0, tx_hash=mock_hash)
            
        else:
            return ExecutionResult(stdout="", stderr=f"Unknown command {cmd}", returncode=1, latency_ms=1.0)

# Step 4: Implement test_swap_skill
async def test_swap_skill(cli: LocalCLIWrapper, logger: LocalTelemetryLogger):
    logger.log_info("test_runner", "run_tc_swap_01", "Starting TC-SWAP-01: Valid Payload (USDC -> MNT)", {"from": "USDC", "to": "MNT"})
    
    original_run = skills.swap.run_byreal_cli
    
    async def mock_run_with_guardrails(args):
        enforce_whitelist(args)
        return await cli.execute_cmd(args)
        
    skills.swap.run_byreal_cli = mock_run_with_guardrails
    
    try:
        skill = skills.swap.SwapSkill()
        
        # TC-SWAP-01
        intent_valid = ParsedIntent(
            rationale="Test valid swap",
            execution_plan=[
                StepExecution(
                    step=1,
                    action="swap",
                    params={
                        "from_token": "USDC",
                        "to_token": "MNT",
                        "amount": 100.0
                    }
                )
            ]
        )
        res = await skill.execute(intent_valid)
        assert res.returncode == 0, "TC-SWAP-01 Failed: expected returncode 0"
        assert res.tx_hash is not None, "TC-SWAP-01 Failed: tx_hash missing"
        logger.log_success("test_runner", "tc_swap_01", f"Passed. Hash: {res.tx_hash}", {"tx_hash": res.tx_hash, "status": "success"})
        
        # TC-SWAP-02
        logger.log_info("test_runner", "run_tc_swap_02", "Starting TC-SWAP-02: Invalid Payload (PEPE -> USDC)", {"from": "PEPE", "to": "USDC"})
        intent_invalid = ParsedIntent(
            rationale="Test invalid swap",
            execution_plan=[
                StepExecution(
                    step=1,
                    action="swap",
                    params={
                        "from_token": "PEPE",
                        "to_token": "USDC",
                        "amount": 100.0
                    }
                )
            ]
        )
        res_invalid = await skill.execute(intent_invalid)
        if res_invalid.returncode != 0:
            logger.log_success("test_runner", "tc_swap_02", f"Passed. Guardrail caught PEPE: {res_invalid.stderr}", {"error": res_invalid.stderr, "status": "blocked"})
        else:
            assert False, "TC-SWAP-02 Failed: Swap validation should have failed."
            
    finally:
        skills.swap.run_byreal_cli = original_run


# Step 5: Implement test_liquidity_skill
import skills.liquidity

async def test_liquidity_skill(cli: LocalCLIWrapper, logger: LocalTelemetryLogger):
    logger.log_info("test_runner", "run_tc_lp_01", "Starting TC-LP-01: Incomplete Ticks for Add Action", {"action": "add", "token_a": "USDC"})
    
    original_run = skills.liquidity.run_byreal_cli
    
    async def mock_run_with_guardrails(args):
        enforce_whitelist(args)
        return await cli.execute_cmd(args)
        
    skills.liquidity.run_byreal_cli = mock_run_with_guardrails
    
    try:
        skill = skills.liquidity.LiquiditySkill()
        
        # TC-LP-01: Missing lower_tick
        intent_invalid = ParsedIntent(
            rationale="Test incomplete tick limits",
            execution_plan=[
                StepExecution(
                    step=1,
                    action="lp",
                    params={
                        "action": "add",
                        "token_a": "USDC",
                        "token_b": "USDY",
                        "amount_a": 100.0,
                        "amount_b": 100.0,
                        "upper_tick": 200000
                        # lower_tick is missing
                    }
                )
            ]
        )
        res_invalid = await skill.execute(intent_invalid)
        if res_invalid.returncode != 0:
            logger.log_success("test_runner", "tc_lp_01", f"Passed. Guardrail caught missing ticks: {res_invalid.stderr}", {"error": res_invalid.stderr, "status": "blocked"})
        else:
            assert False, "TC-LP-01 Failed: Liquidity validation should have failed."
            
        # TC-LP-02: Complete valid payload
        logger.log_info("test_runner", "run_tc_lp_02", "Starting TC-LP-02: Valid Concentrated LP Add", {"lower_tick": -200000, "upper_tick": 200000})
        intent_valid = ParsedIntent(
            rationale="Test valid liquidity add",
            execution_plan=[
                StepExecution(
                    step=1,
                    action="lp",
                    params={
                        "action": "add",
                        "token_a": "USDC",
                        "token_b": "USDY",
                        "amount_a": 100.0,
                        "amount_b": 100.0,
                        "lower_tick": -200000,
                        "upper_tick": 200000
                    }
                )
            ]
        )
        res_valid = await skill.execute(intent_valid)
        assert res_valid.returncode == 0, "TC-LP-02 Failed: expected returncode 0"
        assert res_valid.tx_hash is not None, "TC-LP-02 Failed: tx_hash missing"
        logger.log_success("test_runner", "tc_lp_02", f"Passed. Hash: {res_valid.tx_hash}", {"tx_hash": res_valid.tx_hash, "status": "success"})

    finally:
        skills.liquidity.run_byreal_cli = original_run


# Step 6: Implement test_peg_arbitrage_skill
import skills.peg_arbitrage

async def test_peg_arbitrage_skill(cli: LocalCLIWrapper, logger: LocalTelemetryLogger):
    original_run = skills.peg_arbitrage.run_byreal_cli
    
    async def mock_run_with_guardrails(args):
        # We only enforce whitelist if the command is swap (price doesn't have token flags)
        if args[0] == "swap":
            enforce_whitelist(args)
        return await cli.execute_cmd(args)
        
    skills.peg_arbitrage.run_byreal_cli = mock_run_with_guardrails
    
    try:
        skill = skills.peg_arbitrage.PegArbitrageSkill()
        base_intent = ParsedIntent(
            rationale="Test Arbitrage Logic",
            execution_plan=[
                StepExecution(
                    step=1,
                    action="arbitrage",
                    params={
                        "target_asset": "USDY",
                        "peg_asset": "USDC",
                        "amount": 250.0,
                        "threshold": 0.005,
                        "target_profit": 1.00
                    }
                )
            ]
        )
        
        # TC-ARB-01: Stable Peg
        logger.log_info("test_runner", "run_tc_arb_01", "Starting TC-ARB-01: Stable Peg (1.0000)", {"mock_price": 1.0000})
        cli.mock_price = 1.0000
        res_01 = await skill.execute(base_intent)
        assert res_01.returncode != 0, "TC-ARB-01 Failed: Should have aborted due to stability"
        logger.log_success("test_runner", "tc_arb_01", "Passed. Agent blocked trade (Stable Peg).", {"mock_price": 1.0000, "status": "blocked"})
        
        # TC-ARB-02: Sub-Threshold Deviation
        logger.log_info("test_runner", "run_tc_arb_02", "Starting TC-ARB-02: Sub-Threshold Deviation (0.9990)", {"mock_price": 0.9990})
        cli.mock_price = 0.9990
        res_02 = await skill.execute(base_intent)
        assert res_02.returncode != 0, "TC-ARB-02 Failed: Should have aborted due to sub-threshold"
        logger.log_success("test_runner", "tc_arb_02", "Passed. Agent blocked trade (Sub-Threshold).", {"mock_price": 0.9990, "status": "blocked"})
        
        # TC-ARB-03: Depeg Event & Profitable Swap
        logger.log_info("test_runner", "run_tc_arb_03", "Starting TC-ARB-03: Depeg Event & Profitable Swap (0.9800)", {"mock_price": 0.9800})
        cli.mock_price = 0.9800
        res_03 = await skill.execute(base_intent)
        assert res_03.returncode == 0, "TC-ARB-03 Failed: Should have executed successfully"
        assert res_03.tx_hash is not None, "TC-ARB-03 Failed: Missing tx_hash"
        logger.log_success("test_runner", "tc_arb_03", f"Passed. Profitable Arbitrage Executed! Hash: {res_03.tx_hash}", {"tx_hash": res_03.tx_hash, "status": "executed"})

    finally:
        skills.peg_arbitrage.run_byreal_cli = original_run


async def main():
    print(f"{Colors.HEADER}{Colors.BOLD}--- KinetiFi Master Test Suite Runner Initialization ---{Colors.ENDC}")
    logger = LocalTelemetryLogger()
    cli = LocalCLIWrapper()
    
    await test_swap_skill(cli, logger)
    await test_liquidity_skill(cli, logger)
    await test_peg_arbitrage_skill(cli, logger)

if __name__ == "__main__":
    asyncio.run(main())
