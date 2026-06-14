import os
import sys
import json
import asyncio
from typing import Dict, Any, List
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from core.observability.decision_log import log_telemetry_event

class MantleYieldAgent:
    """
    The Mantle Yield Agent.
    Specializes in RWA yield opportunities and DEX liquidity on the Mantle Network.
    """

    def __init__(self):
        self.system_prompt = (
            "You are the Mantle Yield Agent. Your sole responsibility is to find the best "
            "liquidity opportunities on the Mantle Network and generate transaction bundles. "
            "Your primary strategy is the Merchant Moe WMNT/USDT LP Zap: a single atomic "
            "transaction via the MerchantMoeZapper contract. "
            "You NEVER hold private keys or sign transactions."
        )
        self.mantle_server_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), 
            "../../../../mantle-mcp/server.py"
        ))

    async def execute(self, prompt: str, kwargs: Dict[str, Any] = None) -> Dict[str, Any]:
        log_telemetry_event(
            level="INFO",
            component="mantle_yield_agent",
            action="init",
            description="Initializing connection to Mantle MCP server.",
            metadata={"mantle_server_path": self.mantle_server_path}
        )

        loaded_tools: List[str] = []
        raw_results: Dict[str, Any] = {}
        kwargs = kwargs or {}
        
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
                    
                    # Strict tool filtering — Merchant Moe Zapper Golden Path
                    allowed_tools = [
                        "fetch_meth_yield",
                        "prepare_usdy_wrap",
                        "get_dex_quote",
                        "moe_zap_bundle",
                        "generate_aave_supply_bundle",  # keep for fallback
                    ]
                    for tool in tools_response.tools:
                        if tool.name in allowed_tools:
                            loaded_tools.append(tool.name)

                    log_telemetry_event(
                        level="INFO",
                        component="mantle_yield_agent",
                        action="tool_load",
                        description="Filtered FastMCP tools for Yield Agent.",
                        metadata={"loaded_tools": loaded_tools}
                    )

                    prompt_lower = prompt.lower()
                    if "yield" in prompt_lower and "fetch_meth_yield" in loaded_tools:
                        res = await session.call_tool("fetch_meth_yield")
                        await asyncio.sleep(0.5)
                        if hasattr(res, "content") and len(res.content) > 0:
                            text_data = getattr(res.content[0], "text", str(res.content[0]))
                            try:
                                raw_results["fetch_meth_yield"] = json.loads(text_data)
                            except Exception:
                                raw_results["fetch_meth_yield"] = text_data
                    
                    if "yield" in prompt_lower and "scan_aave_yields" in loaded_tools:
                        res = await session.call_tool("scan_aave_yields")
                        await asyncio.sleep(0.5)
                        if hasattr(res, "content") and len(res.content) > 0:
                            text_data = getattr(res.content[0], "text", str(res.content[0]))
                            try:
                                raw_results["scan_aave_yields"] = json.loads(text_data)
                            except Exception:
                                raw_results["scan_aave_yields"] = text_data
                                
                    if ("usdy" in prompt_lower or "wrap" in prompt_lower) and "prepare_usdy_wrap" in loaded_tools:
                        # Assuming default amounts/addresses for agentic testing
                        from web3.constants import ADDRESS_ZERO
                        res = await session.call_tool("prepare_usdy_wrap", arguments={
                            "amount_wei": 1000000000000000000
                        })
                        await asyncio.sleep(0.5)
                        if hasattr(res, "content") and len(res.content) > 0:
                            text_data = getattr(res.content[0], "text", str(res.content[0]))
                            try:
                                raw_results["prepare_usdy_wrap"] = json.loads(text_data)
                            except Exception:
                                raw_results["prepare_usdy_wrap"] = text_data

                    if ("quote" in prompt_lower or "swap" in prompt_lower) and "get_dex_quote" in loaded_tools:
                        res = await session.call_tool("get_dex_quote", arguments={
                            "dex_name": "agni_finance",
                            "token_in": "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8", # WMNT
                            "token_out": "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9", # USDC
                            "amount_in_wei": 1000000000000000000,
                            "fee_tier": 3000
                        })
                        await asyncio.sleep(0.5)
                        if hasattr(res, "content") and len(res.content) > 0:
                            text_data = getattr(res.content[0], "text", str(res.content[0]))
                            try:
                                raw_results["get_dex_quote"] = json.loads(text_data)
                            except Exception:
                                raw_results["get_dex_quote"] = text_data

                    # ── Merchant Moe Zap Bundle (primary execution path) ──
                    if (
                        any(kw in prompt_lower for kw in ["supply", "bundle", "invest", "zap", "liquidity", "lp", "mnt"])
                        and "moe_zap_bundle" in loaded_tools
                    ):
                        mnt_amount = kwargs.get("amount", 3.0)
                        wallet    = kwargs.get("wallet_address", "0x85F52C53478CD87f571cE18a4a6e43AeBB5DA9D3")
                        res = await session.call_tool("moe_zap_bundle", arguments={
                            "mnt_amount":     mnt_amount,
                            "wallet_address": wallet,
                        })
                        await asyncio.sleep(0.5)
                        if hasattr(res, "content") and len(res.content) > 0:
                            text_data = getattr(res.content[0], "text", str(res.content[0]))
                            try:
                                raw_results["moe_zap_bundle"] = json.loads(text_data)
                            except Exception:
                                raw_results["moe_zap_bundle"] = text_data

                    # ── Aave fallback (kept for non-MNT assets) ──
                    elif (
                        any(kw in prompt_lower for kw in ["supply", "bundle", "invest"])
                        and "generate_aave_supply_bundle" in loaded_tools
                    ):
                        tool_args = {
                            "asset_symbol": kwargs.get("asset_symbol", "USDC"),
                            "amount": kwargs.get("amount", 100.0),
                            "wallet_address": kwargs.get("wallet_address", "0x85F52C53478CD87f571cE18a4a6e43AeBB5DA9D3"),
                            "network": kwargs.get("network", "mainnet")
                        }
                        res = await session.call_tool("generate_aave_supply_bundle", arguments=tool_args)
                        await asyncio.sleep(0.5)
                        if hasattr(res, "content") and len(res.content) > 0:
                            text_data = getattr(res.content[0], "text", str(res.content[0]))
                            try:
                                raw_results["generate_aave_supply_bundle"] = json.loads(text_data)
                            except Exception:
                                raw_results["generate_aave_supply_bundle"] = text_data
        except Exception as e:
            raw_results["mantle_mcp_error"] = str(e)
            
        log_telemetry_event(
            level="INFO",
            component="mantle_yield_agent",
            action="execute",
            description="Finished executing FastMCP yield operations.",
            metadata={"raw_results": raw_results}
        )

        return {
            "agent": "mantle_yield_agent",
            "results": raw_results,
            "zero_trust": True
        }
