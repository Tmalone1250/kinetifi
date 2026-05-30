import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

# Dynamic import path setup to support running tests directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.execution.cli_wrapper import run_byreal_cli

class TestCliWrapper(unittest.IsolatedAsyncioTestCase):
    
    @patch('core.execution.cli_wrapper.asyncio.create_subprocess_exec', new_callable=AsyncMock)
    async def test_run_byreal_cli_success(self, mock_subprocess):
        # Configure mock process
        mock_process = AsyncMock()
        valid_hash = "0x" + "a" * 64
        mock_process.communicate.return_value = (f'Success: Tx Hash {valid_hash}'.encode('utf-8'), b'')
        mock_process.returncode = 0
        mock_subprocess.return_value = mock_process
        
        args = ["swap", "--amount", "1.5", "--from", "WMETH", "--to", "USDC"]
        result = await run_byreal_cli(args)
        
        # Verification
        mock_subprocess.assert_called_once_with(
            "byreal-cli", "swap", "--amount", "1.5", "--from", "WMETH", "--to", "USDC",
            stdout=unittest.mock.ANY,
            stderr=unittest.mock.ANY
        )
        self.assertEqual(result.stdout, f"Success: Tx Hash {valid_hash}")
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.returncode, 0)
        self.assertTrue(result.latency_ms >= 0)
        self.assertEqual(result.tx_hash, valid_hash)

    @patch('core.execution.cli_wrapper.asyncio.create_subprocess_exec', new_callable=AsyncMock)
    async def test_run_byreal_cli_failure(self, mock_subprocess):
        # Configure mock process returning an error
        mock_process = AsyncMock()
        mock_process.communicate.return_value = (b'', b'Error: Insufficient balance')
        mock_process.returncode = 1
        mock_subprocess.return_value = mock_process
        
        args = ["swap", "--amount", "9999.0", "--from", "WMETH", "--to", "MNT"]
        result = await run_byreal_cli(args)
        
        # Verification
        self.assertEqual(result.stdout, "")
        self.assertEqual(result.stderr, "Error: Insufficient balance")
        self.assertEqual(result.returncode, 1)
        self.assertIsNone(result.tx_hash)

    async def test_whitelist_rejection(self):
        args = ["swap", "--amount", "100", "--from", "USDC", "--to", "PEPE"]
        from core.execution.cli_wrapper import WhitelistError
        
        with self.assertRaises(WhitelistError) as context:
            await run_byreal_cli(args)
            
        self.assertIn("Asset 'PEPE' is not whitelisted", str(context.exception))

if __name__ == "__main__":
    unittest.main()
