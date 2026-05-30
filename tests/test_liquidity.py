import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import unittest
import asyncio
from unittest.mock import patch, AsyncMock

from skills.liquidity import LiquidityParams, LiquiditySkill
from core.intent.models import ParsedIntent, StepExecution
from core.execution.cli_wrapper import ExecutionResult

class TestLiquiditySkill(unittest.TestCase):
    
    def test_schema_valid_add(self):
        params = {
            "action": "add",
            "token_a": "USDC",
            "token_b": "USDY",
            "amount_a": 100.0,
            "amount_b": 100.0,
            "lower_tick": -100,
            "upper_tick": 100
        }
        parsed = LiquidityParams(**params)
        self.assertEqual(parsed.action, "add")
        self.assertEqual(parsed.token_a, "USDC")
        self.assertEqual(parsed.lower_tick, -100)

    def test_schema_invalid_add_missing(self):
        params = {
            "action": "add",
            "token_a": "USDC",
            "token_b": "USDY",
            "amount_a": 100.0
            # missing amount_b and ticks
        }
        with self.assertRaises(ValueError):
            LiquidityParams(**params)
            
    def test_schema_valid_remove(self):
        params = {
            "action": "remove",
            "token_id": 1234
        }
        parsed = LiquidityParams(**params)
        self.assertEqual(parsed.action, "remove")
        self.assertEqual(parsed.token_id, 1234)

    def test_schema_invalid_remove_missing(self):
        params = {
            "action": "remove"
        }
        with self.assertRaises(ValueError):
            LiquidityParams(**params)

    @patch("skills.liquidity.run_byreal_cli", new_callable=AsyncMock)
    def test_liquidity_skill_execute_add(self, mock_cli):
        mock_cli.return_value = ExecutionResult(stdout="0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890", stderr="", returncode=0, latency_ms=10.0, tx_hash="0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890")
        
        skill = LiquiditySkill()
        
        intent = ParsedIntent(
            rationale="Test add lp",
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
                        "lower_tick": -100,
                        "upper_tick": 100,
                        "identity": "0xABC"
                    }
                )
            ]
        )
        
        result = asyncio.run(skill.execute(intent))
        
        self.assertEqual(result.returncode, 0)
        self.assertTrue(result.tx_hash is not None)
        mock_cli.assert_called_once_with(["lp", "add", "--tokenA", "USDC", "--tokenB", "USDY", "--amountA", "100.0", "--amountB", "100.0", "--lower", "-100", "--upper", "100", "--identity", "0xABC"])

if __name__ == "__main__":
    unittest.main()
