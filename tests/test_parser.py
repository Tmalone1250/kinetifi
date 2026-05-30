import os
import sys
import json
import unittest
from unittest.mock import AsyncMock, patch, MagicMock

# Dynamic import path setup to support running tests directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.intent.parser import parse_intent
from core.intent.models import ParsedIntent

class TestIntentParser(unittest.IsolatedAsyncioTestCase):
    
    @patch('core.intent.parser.httpx.AsyncClient.post', new_callable=AsyncMock)
    async def test_parse_intent_success(self, mock_post):
        # Construct a mock Ollama JSON response that matches our schema
        mock_response_payload = {
            "rationale": "The user wants to swap 1.5 WMETH to USDC.",
            "execution_plan": [
                {
                    "step": 1,
                    "action": "swap",
                    "params": {
                        "from_token": "WMETH",
                        "to_token": "USDC",
                        "amount": "1.5"
                    }
                }
            ]
        }
        
        # Configure the mock httpx Response
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "response": json.dumps(mock_response_payload)
        }
        mock_post.return_value = mock_response
        
        # Execute the parser using a prompt that fails the deterministic regex (forcing an LLM call)
        complex_prompt = "I would like to convert 1.5 WMETH into USDC."
        intent: ParsedIntent = await parse_intent(complex_prompt)
        
        # Verify correct HTTP call signature
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args.kwargs
        self.assertEqual(call_kwargs["json"]["model"], "qwen2.5:7b")
        self.assertEqual(call_kwargs["json"]["format"], "json")
        self.assertIn(complex_prompt, call_kwargs["json"]["prompt"])
        
        # Verify validation correctly mapped attributes
        self.assertEqual(intent.rationale, "The user wants to swap 1.5 WMETH to USDC.")
        self.assertEqual(len(intent.execution_plan), 1)
        self.assertEqual(intent.execution_plan[0].action, "swap")
        self.assertEqual(intent.execution_plan[0].params["amount"], "1.5")

    async def test_fallback_parse_success(self):
        # A simple, exact-format string should trigger the regex fallback and bypass the LLM
        intent: ParsedIntent = await parse_intent("Swap 2.0 USDC for WMETH")
        
        self.assertEqual(intent.rationale, "Deterministic regex fallback triggered for swap intent.")
        self.assertEqual(len(intent.execution_plan), 1)
        self.assertEqual(intent.execution_plan[0].action, "swap")
        self.assertEqual(intent.execution_plan[0].params["amount"], "2.0")
        self.assertEqual(intent.execution_plan[0].params["from_token"], "USDC")
        self.assertEqual(intent.execution_plan[0].params["to_token"], "WMETH")

if __name__ == "__main__":
    unittest.main()
