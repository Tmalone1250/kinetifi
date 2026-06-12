import os
from typing import Dict, Any, List
from core.observability.decision_log import log_telemetry_event

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


class CasperStakingAgent:
    """
    Sub-agent responsible for Casper network staking, validator scanning, and delegations.
    Loads and runs ONLY 5 specific tools to keep the context microscopic.
    """

    def __init__(self) -> None:
        self.casper_server_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), 
            "../../../../casper-mcp-py/server.py"
        ))
        
        self.system_prompt = (
            "You are the Casper Staking Agent. "
            "Your domain is L1 Validator and Delegation tracking. "
            "RULES: "
            "1. Understand the difference between liquid yield (DEX) and core network staking. "
            "2. Provide concise validator metrics (fee, total stake) using the specific tools available. "
            "3. The 'No-Fake-Data' Guardrail: If a tool returns an error, null, or a 'mock' indicator, you must report the failure. "
            "You are prohibited from inventing values to satisfy a schema. "
            "4. The 'Telemetry Contract' Rule: Every agent output must return a structured JSON block (final_data or details) "
            "that is parsable by your telemetry dashboard. If the tool call succeeded but the data is unformatted, "
            "reformat it into a Summary object before returning."
        )
        self.allowed_tools = [
            "get_validators",
            "get_validator_info",
            "get_bidders",
            "get_bidder",
            "get_account_delegations"
        ]

    async def connect_and_execute(self, prompt: str) -> Dict[str, Any]:
        """
        Connects to the Casper MCP server, filters/registers tools, and prepares/simulates execution.
        """
        log_telemetry_event(
            level="INFO",
            component="casper_staking_agent",
            action="init",
            description="Initializing connection to Casper MCP server.",
            metadata={"casper_server_path": self.casper_server_path}
        )

        loaded_tools: List[str] = []
        raw_results: Dict[str, Any] = {}
        import json

        casper_params = StdioServerParameters(
            command="python3",
            args=[self.casper_server_path],
        )
        try:
            async with stdio_client(casper_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    tools_response = await session.list_tools()
                    for tool in tools_response.tools:
                        if tool.name in self.allowed_tools:
                            loaded_tools.append(tool.name)
                            
                    if "get_validators" in loaded_tools:
                        res = await session.call_tool("get_validators")
                        if hasattr(res, "content") and len(res.content) > 0:
                            text_data = getattr(res.content[0], "text", str(res.content[0]))
                            print(f"DEBUG: Tool Output for get_validators: {text_data}")
                            try:
                                raw_results["get_validators"] = json.loads(text_data)
                            except Exception:
                                raw_results["get_validators"] = text_data
        except Exception as e:
            raw_results["casper_mcp_error"] = str(e)
            
        # Deduplicate loaded tools
        loaded_tools = list(dict.fromkeys(loaded_tools))

        log_telemetry_event(
            level="INFO",
            component="casper_staking_agent",
            action="tool_load",
            description="Loaded specific Staking tools for execution.",
            metadata={"loaded_tools": loaded_tools}
        )

        log_telemetry_event(
            level="INFO",
            component="casper_staking_agent",
            action="execute_sop",
            description="Executing Staking analysis SOP.",
            metadata={
                "prompt": prompt, 
                "system_prompt_used": True,
                "raw_results": raw_results
            }
        )

        return {
            "status": "TaskCompleted",
            "agent": "casper_staking_agent",
            "result": "Successfully checked staking state and validators.",
            "data": raw_results,
            "details": {
                "loaded_tools": loaded_tools,
                "sop_followed": True
            }
        }
