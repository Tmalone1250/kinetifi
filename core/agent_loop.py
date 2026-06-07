import asyncio
from typing import Dict, Any
from core.agents.supervisor import SupervisorAgent
from core.agents.casper_agent import CasperSpecialistAgent
from core.agents.mantle_agent import MantleSpecialistAgent
from core.observability.decision_log import log_telemetry_event

class MultiAgentLoop:
    """
    Primary entry point for the Multi-Agent architecture.
    Orchestrates the lifecycle: Supervisor -> Specialist -> Task Complete -> User Response.
    """

    def __init__(self):
        self.supervisor = SupervisorAgent()

    async def process_intent(self, user_prompt: str) -> Dict[str, Any]:
        """
        Processes a natural language prompt entirely through the Multi-Agent framework.
        """
        # Step 1: Supervisor Init & Intent Routing
        log_telemetry_event(
            level="INFO",
            component="agent_loop",
            action="init",
            description="Processing new user prompt through the multi-agent loop.",
            metadata={"user_prompt": user_prompt}
        )

        routing_result = self.supervisor.route_intent(user_prompt)

        if routing_result["status"] == "error":
            return {
                "success": False,
                "message": routing_result["error"]
            }

        target_agent = routing_result["target_agent"]
        sub_agent_response = {}

        # Step 2 & 3: Specialist Initialization & Execution
        if target_agent == "casper":
            agent = CasperSpecialistAgent()
            sub_agent_response = await agent.connect_and_execute(user_prompt)
        elif target_agent == "mantle":
            agent = MantleSpecialistAgent()
            sub_agent_response = await agent.execute_intent(user_prompt)
        else:
            return {
                "success": False,
                "message": f"Unknown target agent defined: {target_agent}"
            }

        # Step 4: Success -> Task Complete
        if sub_agent_response.get("status") == "TaskCompleted":
            # Formulate final user-facing response
            final_response = f"Successfully delegated and completed task on {target_agent.capitalize()} network."
            
            log_telemetry_event(
                level="SUCCESS",
                component="agent_loop",
                action="task_complete",
                description=f"Task successfully completed by {target_agent} agent.",
                metadata={
                    "sub_agent_response": sub_agent_response,
                    "final_response": final_response
                }
            )

            return {
                "success": True,
                "response": final_response,
                "details": sub_agent_response
            }
        else:
            # Sub-agent failed
            log_telemetry_event(
                level="ERROR",
                component="agent_loop",
                action="task_failed",
                description=f"Task failed during execution by {target_agent} agent.",
                metadata={"sub_agent_response": sub_agent_response}
            )

            return {
                "success": False,
                "message": f"Task execution failed on {target_agent} network.",
                "details": sub_agent_response
            }

# Example local execution block
if __name__ == "__main__":
    loop = MultiAgentLoop()
    asyncio.run(loop.process_intent("I want to swap tokens on the casper network."))
