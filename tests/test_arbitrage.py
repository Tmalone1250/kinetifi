import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import unittest
import asyncio
from unittest.mock import patch, AsyncMock

from skills.peg_arbitrage import ArbitrageParams, PegArbitrageSkill
from core.intent.models import ParsedIntent, StepExecution
from core.execution.cli_wrapper import ExecutionResult

class TestArbitrageSkill(unittest.TestCase):
    
    def test_schema_valid(self):
        params = {
            "target_asset": "USDY",
            "peg_asset": "USDC",
            "amount": 500.0,
            "threshold": 0.01,
            "target_profit": 2.0
        }
        parsed = ArbitrageParams(**params)
        self.assertEqual(parsed.target_asset, "USDY")
        self.assertEqual(parsed.amount, 500.0)

    def test_schema_invalid_asset(self):
        params = {
            "target_asset": "MNT", # Invalid for peg arbitrage
            "peg_asset": "USDC"
        }
        with self.assertRaises(ValueError):
            ArbitrageParams(**params)

    @patch("skills.peg_arbitrage.run_byreal_cli", new_callable=AsyncMock)
    def test_execute_profit_holds(self, mock_cli):
        # 0.98 Price -> 0.02 deviation
        # amount 250 -> 5.0 gross profit -> 4.9985 NAP > 1.0 (target)
        # Should succeed. Under-peg -> buy USDY with USDC.
        mock_cli.side_effect = [
            ExecutionResult(stdout="Price: 0.9800", stderr="", returncode=0, latency_ms=5.0), # _query_pool_price in validate
            ExecutionResult(stdout="Price: 0.9800", stderr="", returncode=0, latency_ms=5.0), # _query_pool_price in execute
            ExecutionResult(stdout="0xabcdef", stderr="", returncode=0, latency_ms=10.0, tx_hash="0xabcdef") # swap
        ]
        
        skill = PegArbitrageSkill()
        intent = ParsedIntent(
            rationale="Test Arb",
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
        
        result = asyncio.run(skill.execute(intent))
        
        self.assertEqual(result.returncode, 0)
        self.assertEqual(mock_cli.call_count, 3)
        mock_cli.assert_called_with(["swap", "--from", "USDC", "--to", "USDY", "--amount", "250.0", "--identity", "0x0529"])

    @patch("skills.peg_arbitrage.run_byreal_cli", new_callable=AsyncMock)
    def test_execute_profit_fails(self, mock_cli):
        # 0.999 Price -> 0.001 deviation
        # Abs deviation (0.001) < threshold (0.005) -> returns False in validate_preflight
        mock_cli.side_effect = [
            ExecutionResult(stdout="Price: 0.9990", stderr="", returncode=0, latency_ms=5.0)
        ]
        
        skill = PegArbitrageSkill()
        intent = ParsedIntent(
            rationale="Test Arb",
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
        
        result = asyncio.run(skill.execute(intent))
        
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stderr, "Arbitrage triggers not validated.")
        self.assertEqual(mock_cli.call_count, 1)

if __name__ == "__main__":
    unittest.main()
