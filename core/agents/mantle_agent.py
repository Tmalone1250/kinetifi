import os
import sys
# Add the root KinetiFi directory to the python path so 'core' can be resolved
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

import asyncio
import json
import subprocess
from typing import Dict, Any
import ast
from langchain_core.messages import ToolMessage
from core.observability.decision_log import log_telemetry_event
from core.agents.sub_agents.mantle.mantle_yield_agent import MantleYieldAgent
from core.agents.sub_agents.mantle.mantle_identity_agent import MantleIdentityAgent
from core.agents.sub_agents.mantle.mantle_execution_agent import MantleExecutionAgent
from core.skills.byreal_wrapper import byreal_swap_skill, byreal_lp_skill


def get_last_tool_output(messages: list) -> str | None:
    """Safely extracts and formats the exact JSON payload from the last ToolMessage."""
    for msg in reversed(messages):
        # Check for standard ToolMessage or matching type attribute
        if getattr(msg, "type", "") == "tool" or isinstance(msg, ToolMessage):
            content = msg.content
            try:
                # Convert Python string representation to actual dict
                if isinstance(content, str):
                    parsed_dict = ast.literal_eval(content)
                else:
                    parsed_dict = content
                # Dump to strict double-quoted JSON for the React frontend
                return json.dumps(parsed_dict, indent=2)
            except (ValueError, SyntaxError, TypeError):
                # Fallback if evaluation fails
                return str(content)
    return None

class MantleChainRouter:
    """
    The Mantle Chain Router.
    Analyzes intent and delegates to specialized agents. Never touches the blockchain directly.
    """

    def __init__(self, agent_identity_id: int = 1, session_id: str = "default_session"):
        self.agent_identity_id = agent_identity_id
        self.session_id = session_id
        log_telemetry_event(
            level="INFO",
            component="mantle_chain_router",
            action="init",
            description="Initializing Mantle Chain Router.",
            metadata={
                "agent_identity_id": self.agent_identity_id,
                "session_id": self.session_id
            }
        )

    async def connect_and_execute(self, handoff_payload: Dict[str, Any], decision_hash: str = "0x0000") -> Dict[str, Any]:
        """
        Processes a delegated intent and routes to sub-agents via ReAct loop.
        """
        original_intent = handoff_payload.get("original_intent", "")
        parsed = handoff_payload.get("parsed_intent", {})
        # 1. Safely extract wallet_address FIRST with zero-address fallback
        wallet_address = handoff_payload.get("wallet_address") or "0x0000000000000000000000000000000000000000"
        
        log_telemetry_event(
            level="INFO",
            component="mantle_chain_router",
            action="route",
            description="Routing intent for Mantle network using ReAct agent.",
            metadata={
                "original_intent": original_intent,
                "parsed_intent": parsed,
                "agent_identity_id": self.agent_identity_id,
                "session_id": self.session_id,
                "decision_hash": decision_hash
            }
        )

        execution_prompt = (
            f"Execute this intent: '{original_intent}'. "
            f"Parameters: Network={parsed.get('network')}, "
            f"Min TVL={parsed.get('min_tvl_usd')}. "
            "Invoke your tools now and format the results."
        )

        from langchain_openai import ChatOpenAI
        from langgraph.prebuilt import create_react_agent
        from langchain_core.tools import tool
        import os
        
        llm = ChatOpenAI(
            model=os.getenv("INTENT_MODEL", "qwen2.5:7b"),
            base_url=f"{os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')}/v1",
            api_key="ollama",
            temperature=0
        )
        
        @tool
        async def scan_yields(user_intent: str) -> str:
            """Scans Mantle liquidity pools for the best APY. Use this ONLY for Yield Research."""
            log_telemetry_event(
                level="INFO",
                component="mantle_chain_router",
                action="tool_invocation",
                description="Invoking: scan_yields",
                metadata={"tool": "scan_yields", "user_intent": user_intent}
            )
            yield_agent = MantleYieldAgent()
            res = await yield_agent.execute(prompt="fetch yield " + user_intent)
            
            # Extract opportunities from the agent response
            opportunities = []
            if "scan_aave_yields" in res.get("results", {}):
                scan_res = res["results"]["scan_aave_yields"]
                if isinstance(scan_res, dict) and scan_res.get("status") == "success":
                    opportunities = scan_res.get("opportunities", [])
                    
            if opportunities:
                intent_upper = user_intent.upper()
                if "MNT" in intent_upper:
                    # Filter for MNT or WMNT (using the WMNT contract address to be precise if needed)
                    # But the MCP tool returns raw addresses. Let's filter loosely using a known list or let LLM decide.
                    # Or we just pass the full list to the LLM and let it figure it out since it has addresses.
                    pass
                res["results"]["on_chain_pools"] = opportunities
            else:
                res["results"]["on_chain_pools"] = "No on-chain yield opportunities found or tool failed."
                
            return json.dumps(res.get("results", {}))

        @tool
        async def generate_transaction_bundle(asset_symbol: str, amount: float) -> str:
            """Generates an unsigned transaction bundle. Use this when the user asks to supply or invest."""
            log_telemetry_event(
                level="INFO",
                component="mantle_chain_router",
                action="tool_invocation",
                description="Invoking: generate_transaction_bundle",
                metadata={"tool": "generate_transaction_bundle", "asset_symbol": asset_symbol, "amount": amount}
            )
            yield_agent = MantleYieldAgent()
            res = await yield_agent.execute(prompt=f"supply {asset_symbol}", kwargs={
                "asset_symbol": asset_symbol,
                "amount": amount,
                "wallet_address": wallet_address,
                "network": "mainnet"
            })
            return json.dumps(res.get("results", {}))

        # 2. Format the prompt with the wallet_address AFTER the variable is defined
        # Use string.Template so $wallet_address is replaced while {curly_brace} placeholders
        # for LLM output formatting are left completely untouched.
        from string import Template
        MANTLE_SUBAGENT_PROMPT_TEMPLATE = Template("""\
You are the Mantle Chain Router, a DeFi yield specialist agent.

CRITICAL CONTEXT:  
- The user's connected wallet address is: $wallet_address  
- DefiLlama Pool IDs are UUIDs (e.g., d8733ab8...), NOT smart contract addresses.

RULES FOR BEHAVIOR & HUMAN-IN-THE-LOOP:  
You must strictly separate Research from Execution. Never do both simultaneously unless explicitly commanded.

1. YIELD RESEARCH (If user asks for APY/Yields):  
   - Call the `scan_yields` tool. If the user specifies an asset (e.g., "MNT"), you must filter the results for that specific asset.  
   - Present the top pool for their asset.  
   - HITL CONFIRMATION: After presenting the yield, you MUST ask: "Would you like me to generate the transaction bundle to supply your tokens to this pool?"  
   - DO NOT generate a transaction bundle yet.

2. TRANSACTION EXECUTION (If user confirms or explicitly asks to execute):  
   - Call the execution tool (e.g., `generate_transaction_bundle`).  
   - DO NOT call the `scan_yields` tool during an execution request.  
   - Once the bundle is generated, briefly confirm the strategy (e.g., "Here is the 3-step strategy to wrap and supply your MNT").  
   - CRITICAL: You MUST append the exact raw JSON block containing the `bundle` array to the very end of your response, enclosed in ```json and ``` tags.  
""")
        MANTLE_SUBAGENT_PROMPT = MANTLE_SUBAGENT_PROMPT_TEMPLATE.substitute(wallet_address=wallet_address)

        mantle_react_agent = create_react_agent(
            model=llm,
            tools=[scan_yields, generate_transaction_bundle],
            prompt=MANTLE_SUBAGENT_PROMPT
        )
        
        result = await mantle_react_agent.ainvoke({"messages": [("user", execution_prompt)]})
        all_messages = result["messages"]

        # SILVER BULLET: Bypass LLM summarization by extracting raw tool output directly
        tool_output = get_last_tool_output(all_messages)
        pending_bundle = None
        if tool_output and "bundle" in str(tool_output):
            try:
                parsed = json.loads(tool_output)
                
                bundle_obj = None
                if isinstance(parsed, dict):
                    if "bundle" in parsed:
                        bundle_obj = parsed
                    else:
                        for key, val in parsed.items():
                            if isinstance(val, dict) and "bundle" in val:
                                bundle_obj = val
                                break
                                
                if bundle_obj:
                    # Strip the markdown json block from the LLM's response to keep UI clean
                    import re
                    content = all_messages[-1].content
                    clean_content = re.sub(r"```\w*\s*[\s\S]*?```", "", content).strip()
                    response_text = clean_content if clean_content else "Here is the transaction bundle for your review."

                    
                    pending_bundle = bundle_obj
                    log_telemetry_event(
                        level="SUCCESS",
                        component="mantle_chain_router",
                        action="bundle_intercepted",
                        description="Deterministically intercepted raw bundle from ToolMessage — bypassing LLM summarization.",
                        metadata={"steps": len(bundle_obj.get('bundle', []))}
                    )
                else:
                    response_text = all_messages[-1].content
            except (json.JSONDecodeError, TypeError):
                response_text = all_messages[-1].content
        else:
            # Non-execution query — use normal LLM AIMessage
            response_text = all_messages[-1].content

        return {
            "status": "TaskCompleted",
            "agent": "mantle_chain_router",
            "data": {"mantle_yield_agent": {"results": {}}},
            "response": response_text,
            "pending_bundle": pending_bundle,
            "details": {
                "zero_trust_enforced": True,
                "agent_identity_id": self.agent_identity_id,
                "session_id": self.session_id,
                "decision_hash": decision_hash
            }
        }

    def route_cli_skill(self, skill_command: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Exclusively for Byreal CLI invocations (Solana DEX interactions).
        Acts as a pure switch statement routing strictly to schema-validated wrappers.
        """
        log_telemetry_event(
            level="INFO",
            component="mantle_chain_router",
            action="route_cli_skill",
            description=f"Routing CLI skill: {skill_command}",
            metadata={
                "skill_command": skill_command,
                "agent_identity_id": self.agent_identity_id,
                "session_id": self.session_id,
                "decision_hash": payload.get("decision_hash")
            }
        )

        try:
            if skill_command == "byreal_swap":
                result = byreal_swap_skill(payload)
            elif skill_command == "byreal_lp":
                result = byreal_lp_skill(payload)
            else:
                result = {"status": "failed", "error": f"Unknown skill command: {skill_command}"}
                
            log_telemetry_event(
                level="INFO" if result.get("status") == "success" else "ERROR",
                component="mantle_chain_router",
                action="cli_skill_executed",
                description=f"Executed CLI skill: {skill_command}",
                metadata={
                    "skill_command": skill_command,
                    "agent_identity_id": self.agent_identity_id,
                    "session_id": self.session_id,
                    "result": result
                }
            )
            return result
        except Exception as e:
            error_res = {"status": "failed", "error": str(e)}
            log_telemetry_event(
                level="ERROR",
                component="mantle_chain_router",
                action="cli_skill_failed",
                description=f"CLI skill failed: {skill_command}",
                metadata={"error": str(e)}
            )
            return error_res

    def route_evm_tx(self, payload: Dict[str, Any], decision_hash: str) -> Dict[str, Any]:
        """
        Exclusively for direct Mantle EVM interactions.
        Delegates strictly typed, unsigned JSON payloads to the MantleExecutionAgent.
        """
        execution_agent = MantleExecutionAgent()
        return execution_agent.execute_payload(
            agent_identity_id=self.agent_identity_id,
            session_id=self.session_id,
            decision_hash=decision_hash,
            payload=payload
        )

if __name__ == "__main__":
    async def main():
        print("Testing MantleChainRouter and Execution Pipeline...")
        router = MantleChainRouter()
        
        # 1. Trigger the Router to test the Global Router Integration for Byreal CLI
        res = await router.connect_and_execute("Swap 10 USDC for WETH on Byreal using my identity")
        
        # We extract the execution result from the new Byreal CLI Lane
        print("\nGlobal Router CLI Lane Result:\n" + json.dumps(res, indent=2))
        
    asyncio.run(main())
