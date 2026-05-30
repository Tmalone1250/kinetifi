import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

# Dynamic import path setup to support running tests directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.intent.models import ParsedIntent, StepExecution
from core.execution.cli_wrapper import ExecutionResult
from skills.peg_arbitrage import PegArbitrageSkill

class TestPegArbitrageSkill(unittest.IsolatedAsyncioTestCase):

    @patch('skills.peg_arbitrage.run_byreal_cli', new_callable=AsyncMock)
    async def test_successful_swap_routing(self, mock_run_cli):
        # Configure the mock execution result
        mock_run_cli.return_value = ExecutionResult(
            stdout="Success",
            stderr="",
            returncode=0,
            latency_ms=15.0,
            tx_hash="0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )
        
        # Build a valid ParsedIntent
        intent = ParsedIntent(
            rationale="Capturing 1.5% discount on USDY",
            execution_plan=[
                StepExecution(
                    step=1,
                    action="swap",
                    params={
                        "amount": "100.0",
                        "from_token": "USDC",
                        "to_token": "USDY"
                    }
                )
            ]
        )
        
        skill = PegArbitrageSkill()
        result = await skill.execute(intent)
        
        # Verify the arguments were constructed correctly
        mock_run_cli.assert_called_once_with(
            ["swap", "--from", "USDC", "--to", "USDY", "--amount", "100.0", "--identity", "0x0529"]
        )
        
        # Verify return payload
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "Success")
        
    async def test_missing_params(self):
        intent = ParsedIntent(
            rationale="Bad intent without amount",
            execution_plan=[
                StepExecution(
                    step=1,
                    action="swap",
                    params={
                        "from_token": "USDC",
                        "to_token": "USDY"
                    }
                )
            ]
        )
        skill = PegArbitrageSkill()
        
        with self.assertRaisesRegex(ValueError, "Missing required parameters"):
            await skill.execute(intent)

    async def test_unsupported_action(self):
        intent = ParsedIntent(
            rationale="Test unsupported",
            execution_plan=[
                StepExecution(
                    step=1,
                    action="borrow",
                    params={}
                )
            ]
        )
        skill = PegArbitrageSkill()
        
        with self.assertRaises(NotImplementedError):
            await skill.execute(intent)

if __name__ == "__main__":
    unittest.main()
