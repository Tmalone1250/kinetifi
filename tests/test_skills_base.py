import os
import sys
import unittest

# Dynamic import path setup to support running tests directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from skills.base import BaseSkill
from core.intent.models import ParsedIntent
from core.execution.cli_wrapper import ExecutionResult

class TestSkillsBase(unittest.IsolatedAsyncioTestCase):
    
    def test_cannot_instantiate_base_skill(self):
        # Attempting to instantiate an abstract base class directly should raise TypeError
        with self.assertRaises(TypeError):
            skill = BaseSkill()
            
    async def test_implemented_skill_success(self):
        # A concrete subclass that properly implements execute() should work fine
        class MockValidSkill(BaseSkill):
            async def execute(self, intent: ParsedIntent) -> ExecutionResult:
                return ExecutionResult(
                    stdout="Mock success",
                    stderr="",
                    returncode=0,
                    latency_ms=10.0,
                    tx_hash=None
                )
                
        skill = MockValidSkill()
        
        # Test executing the mock skill
        intent = ParsedIntent(rationale="Test", execution_plan=[])
        result = await skill.execute(intent)
        
        self.assertEqual(result.stdout, "Mock success")
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.latency_ms, 10.0)

if __name__ == "__main__":
    unittest.main()
