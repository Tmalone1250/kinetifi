import os
import sys
import json
import unittest
import tempfile
from unittest.mock import patch

# Dynamic import path setup to support running tests directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.observability.decision_log import log_telemetry_event

class TestDecisionLog(unittest.TestCase):
    
    def setUp(self):
        # Create a temporary file to act as our telemetry stream during tests
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_file = os.path.join(self.temp_dir.name, "test_event_stream.json")

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_log_telemetry_event_success(self):
        # Patch the file path in the observability module so it writes to our temp file
        with patch('core.observability.decision_log.EVENT_STREAM_PATH', self.temp_file):
            
            # Execute logging
            log_telemetry_event(
                level="SUCCESS",
                component="test_module",
                action="test_action",
                description="Testing the telemetry JSON structure.",
                metadata={"gas_used": 0.05, "tx_hash": "0xabc"}
            )
            
            # Verify file creation
            self.assertTrue(os.path.exists(self.temp_file))
            
            # Verify structured JSON
            with open(self.temp_file, "r") as f:
                lines = f.readlines()
                
            self.assertEqual(len(lines), 1)
            event = json.loads(lines[0])
            
            # Assert schema guarantees
            self.assertIn("timestamp", event)
            self.assertEqual(event["level"], "SUCCESS")
            self.assertEqual(event["component"], "test_module")
            self.assertEqual(event["action"], "test_action")
            self.assertEqual(event["description"], "Testing the telemetry JSON structure.")
            self.assertEqual(event["metadata"]["gas_used"], 0.05)
            self.assertEqual(event["metadata"]["tx_hash"], "0xabc")

if __name__ == "__main__":
    unittest.main()
