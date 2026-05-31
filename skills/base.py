from abc import ABC, abstractmethod
from core.intent.models import ParsedIntent
from core.execution.cli_wrapper import ExecutionResult

class BaseSkill(ABC):
    """
    Abstract Base Class for all KinetiFi Skills.
    Every specialized skill (e.g., PegArbitrageSkill) must inherit from this class
    and implement the `execute` method.
    """
    
    @abstractmethod
    async def execute(self, intent: ParsedIntent) -> ExecutionResult:
        """
        Asynchronously executes the logic required for this skill.
        
        Args:
            intent (ParsedIntent): The structured intent execution plan.
            
        Returns:
            ExecutionResult: The standard telemetry-ready execution output.
        """
        pass
