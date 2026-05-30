import os
import sys
import unittest

# Dynamic import path setup to support running tests directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from pydantic import ValidationError
from core.intent.models import ParsedIntent, StepExecution

class TestIntentModels(unittest.TestCase):
    def test_valid_parsed_intent(self):
        payload = {
            "rationale": "Swap WMETH to USDC as per strategy.",
            "execution_plan": [
                {
                    "step": 1,
                    "action": "swap",
                    "params": {"from_token": "WMETH", "to_token": "USDC", "amount": "0.1"}
                }
            ]
        }
        intent = ParsedIntent(**payload)
        self.assertEqual(intent.rationale, "Swap WMETH to USDC as per strategy.")
        self.assertEqual(len(intent.execution_plan), 1)
        
        step1 = intent.execution_plan[0]
        self.assertEqual(step1.step, 1)
        self.assertEqual(step1.action, "swap")
        self.assertEqual(step1.params["from_token"], "WMETH")

    def test_invalid_parsed_intent_missing_fields(self):
        payload = {
            "execution_plan": [
                {
                    "step": 1,
                    "action": "swap"
                }
            ]
        }
        with self.assertRaises(ValidationError):
            ParsedIntent(**payload)

    def test_invalid_step_type(self):
        payload = {
            "rationale": "Test invalid step.",
            "execution_plan": [
                {
                    "step": "one",  # Should be an int
                    "action": "check_balance"
                }
            ]
        }
        with self.assertRaises(ValidationError):
            ParsedIntent(**payload)

if __name__ == "__main__":
    unittest.main()
