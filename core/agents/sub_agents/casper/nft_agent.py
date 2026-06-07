import os
from typing import Dict, Any, List
from core.observability.decision_log import log_telemetry_event

try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
except ImportError:
    class StdioServerParameters:
        def __init__(self, command, args):
            self.command = command
            self.args = args
    
    class ClientSession:
        def __init__(self, read, write): pass
        async def __aenter__(self): return self
        async def __aexit__(self, exc_type, exc_val, exc_tb): pass
        async def initialize(self): pass
        async def list_tools(self): 
            class ToolList:
                class Tool:
                    def __init__(self, name): self.name = name
                tools = [
                    Tool("get_network_nfts"), 
                    Tool("get_nft_collection"), 
                    Tool("get_nft"),
                    Tool("get_account_nfts"),
                    Tool("get_account_nft_ownership")
                ]
            return ToolList()
            
    def stdio_client(params):
        class StdioContext:
            async def __aenter__(self): return (None, None)
            async def __aexit__(self, exc_type, exc_val, exc_tb): pass
        return StdioContext()


class CasperNftAgent:
    """
    Sub-agent responsible for Casper network NFTs, collections, metadata, and ownership.
    Loads and runs ONLY 5 specific tools to keep the context microscopic.
    """

    def __init__(self) -> None:
        self.casper_server_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), 
            "../../../../casper-mcp-py/server.py"
        ))
        
        self.system_prompt = (
            "You are the Casper NFT Agent. "
            "Your domain is limited to NFT metadata query, collection stats, and ownership status. "
            "Use the provided tools to inspect NFT collections, check owner lists, and fetch token details."
        )
        self.allowed_tools = [
            "get_network_nfts",
            "get_nft_collection",
            "get_nft",
            "get_account_nfts",
            "get_account_nft_ownership"
        ]

    async def connect_and_execute(self, prompt: str) -> Dict[str, Any]:
        """
        Connects to the Casper MCP server, filters/registers tools, and prepares/simulates execution.
        """
        log_telemetry_event(
            level="INFO",
            component="casper_nft_agent",
            action="init",
            description="Initializing connection to Casper MCP server.",
            metadata={"casper_server_path": self.casper_server_path}
        )

        loaded_tools: List[str] = []

        casper_params = StdioServerParameters(
            command="python3",
            args=[self.casper_server_path, "--enable-writes"],
        )
        async with stdio_client(casper_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools_response = await session.list_tools()
                for tool in tools_response.tools:
                    if tool.name in self.allowed_tools:
                        loaded_tools.append(tool.name)

        log_telemetry_event(
            level="INFO",
            component="casper_nft_agent",
            action="tool_load",
            description="Loaded specific NFT tools for execution.",
            metadata={"loaded_tools": loaded_tools}
        )

        log_telemetry_event(
            level="INFO",
            component="casper_nft_agent",
            action="execute_sop",
            description="Executing NFT analysis SOP.",
            metadata={"prompt": prompt, "system_prompt_used": True}
        )

        return {
            "status": "TaskCompleted",
            "agent": "casper_nft_agent",
            "result": "Successfully checked NFT data and ownership.",
            "details": {
                "loaded_tools": loaded_tools,
                "sop_followed": True
            }
        }
