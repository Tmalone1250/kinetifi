import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import unittest
import asyncio
from unittest.mock import patch, AsyncMock

from skills.swap import SwapSkillParams, SwapSkill
from core.intent.models import ParsedIntent, StepExecution
from core.execution.cli_wrapper import ExecutionResult

class TestSwapSkill(unittest.TestCase):
    
    def test_schema_valid(self):
        params = {
            "from_token": "USDC",
            "to_token": "MNT",
            "amount": 100.0,
            "identity": "0x123"
        }
        parsed = SwapSkillParams(**params)
        self.assertEqual(parsed.from_token, "USDC")
        self.assertEqual(parsed.amount, 100.0)

    def test_schema_invalid_whitelist(self):
        params = {
            "from_token": "USDT", # Not whitelisted
            "to_token": "MNT",
            "amount": 100.0,
            "identity": "0x123"
        }
        with self.assertRaises(ValueError):
            SwapSkillParams(**params)

    def test_schema_invalid_amount(self):
        params = {
            "from_token": "USDC",
            "to_token": "MNT",
            "amount": -5.0, # Negative
            "identity": "0x123"
        }
        with self.assertRaises(ValueError):
            SwapSkillParams(**params)

    @patch("skills.swap.run_byreal_cli", new_callable=AsyncMock)
    def test_swap_skill_execute(self, mock_cli):
        mock_cli.return_value = ExecutionResult(stdout="0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890", stderr="", returncode=0, latency_ms=10.0, tx_hash="0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890")
        
        skill = SwapSkill()
        
        intent = ParsedIntent(
            rationale="Test intent",
            execution_plan=[
                StepExecution(
                    step=1,
                    action="swap",
                    params={
                        "from_token": "USDC",
                        "to_token": "WMETH",
                        "amount": 50.0,
                        "identity": "0xABC"
                    }
                )
            ]
        )
        
        result = asyncio.run(skill.execute(intent))
        
        self.assertEqual(result.returncode, 0)
        self.assertTrue(result.tx_hash is not None)
        mock_cli.assert_called_once_with(["swap", "--from", "USDC", "--to", "WMETH", "--amount", "50.0", "--identity", "0xABC"])

if __name__ == "__main__":
    unittest.main()
