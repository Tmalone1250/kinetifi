import os
import sys
import json
import asyncio
from typing import Dict, Any, List
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from core.observability.decision_log import log_telemetry_event

class MantleIdentityAgent:
    """
    The Mantle Identity Agent.
    Specializes in ERC-8004 Agent Identities and Reputation on the Mantle Network.
    """

    def __init__(self):
        self.system_prompt = (
            "You are the Mantle Identity Agent. Your sole responsibility is to manage "
            "ERC-8004 Agent Identities and Reputation on the Mantle Network. "
            "You use FastMCP tools to check agent identities, query reputation scores, "
            "and prepare unsigned EVM payloads for agent registration. "
            "You NEVER hold private keys or sign transactions."
        )
        self.mantle_server_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), 
            "../../../../mantle-mcp/server.py"
        ))

    async def execute(self, prompt: str) -> Dict[str, Any]:
        log_telemetry_event(
            level="INFO",
            component="mantle_identity_agent",
            action="init",
            description="Initializing connection to Mantle MCP server.",
            metadata={"mantle_server_path": self.mantle_server_path}
        )

        loaded_tools: List[str] = []
        raw_results: Dict[str, Any] = {}
        
        python_exe = sys.executable
        venv_python = os.path.join(os.path.dirname(self.mantle_server_path), ".venv", "bin", "python")
        if os.path.exists(venv_python):
            python_exe = venv_python
            
        mantle_params = StdioServerParameters(
            command=python_exe,
            args=[self.mantle_server_path],
            env={**os.environ, "PYTHONPATH": os.path.dirname(self.mantle_server_path)}
        )

        try:
            async with stdio_client(mantle_params) as (read_stream, write_stream):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()
                    tools_response = await session.list_tools()
                    
                    # Strict tool filtering
                    allowed_tools = [
                        "verify_erc8004_identity", 
                        "query_erc8004_reputation", 
                        "prepare_agent_registration"
                    ]
                    for tool in tools_response.tools:
                        if tool.name in allowed_tools:
                            loaded_tools.append(tool.name)

                    log_telemetry_event(
                        level="INFO",
                        component="mantle_identity_agent",
                        action="tool_load",
                        description="Filtered FastMCP tools for Identity Agent.",
                        metadata={"loaded_tools": loaded_tools}
                    )

                    prompt_lower = prompt.lower()
                    
                    if ("verify" in prompt_lower or "identity" in prompt_lower) and "verify_erc8004_identity" in loaded_tools:
                        # Assuming default identity id for testing
                        res = await session.call_tool("verify_erc8004_identity", arguments={"identity_id": 1})
                        await asyncio.sleep(0.5)
                        if hasattr(res, "content") and len(res.content) > 0:
                            text_data = getattr(res.content[0], "text", str(res.content[0]))
                            try:
                                raw_results["verify_erc8004_identity"] = json.loads(text_data)
                            except Exception:
                                raw_results["verify_erc8004_identity"] = text_data

                    if ("reputation" in prompt_lower or "score" in prompt_lower) and "query_erc8004_reputation" in loaded_tools:
                        res = await session.call_tool("query_erc8004_reputation", arguments={"identity_id": 1})
                        await asyncio.sleep(0.5)
                        if hasattr(res, "content") and len(res.content) > 0:
                            text_data = getattr(res.content[0], "text", str(res.content[0]))
                            try:
                                raw_results["query_erc8004_reputation"] = json.loads(text_data)
                            except Exception:
                                raw_results["query_erc8004_reputation"] = text_data
                                
                    if ("register" in prompt_lower or "mint" in prompt_lower) and "prepare_agent_registration" in loaded_tools:
                        # Assuming default amounts/addresses for agentic testing
                        res = await session.call_tool("prepare_agent_registration", arguments={
                            "owner_address": "0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111",
                            "metadata_uri": "ipfs://QmTest"
                        })
                        await asyncio.sleep(0.5)
                        if hasattr(res, "content") and len(res.content) > 0:
                            text_data = getattr(res.content[0], "text", str(res.content[0]))
                            try:
                                raw_results["prepare_agent_registration"] = json.loads(text_data)
                            except Exception:
                                raw_results["prepare_agent_registration"] = text_data

        except Exception as e:
            raw_results["mantle_mcp_error"] = str(e)
            
        log_telemetry_event(
            level="INFO",
            component="mantle_identity_agent",
            action="execute",
            description="Finished executing FastMCP identity operations.",
            metadata={"raw_results": raw_results}
        )

        return {
            "agent": "mantle_identity_agent",
            "results": raw_results,
            "zero_trust": True
        }
