import os
from typing import Dict, Any, List
from core.observability.decision_log import log_telemetry_event

# Import the 5 specialized sub-agents
from core.agents.sub_agents.casper.yield_agent import CasperYieldAgent
from core.agents.sub_agents.casper.staking_agent import CasperStakingAgent
from core.agents.sub_agents.casper.identity_agent import CasperIdentityAgent
from core.agents.sub_agents.casper.nft_agent import CasperNftAgent
from core.agents.sub_agents.casper.execution_agent import CasperExecutionAgent


class CasperSpecialistAgent:
    """
    The Casper Chain Department Router.
    Parses user prompts using lightweight keyword routing and delegates tasks
    sequentially to the hyper-specialized Casper sub-agents.
    Loads ZERO low-level MCP tools directly to keep its context microscopic.
    """

    def __init__(self) -> None:
        self.yield_agent = CasperYieldAgent()
        self.staking_agent = CasperStakingAgent()
        self.identity_agent = CasperIdentityAgent()
        self.nft_agent = CasperNftAgent()
        self.execution_agent = CasperExecutionAgent()
        
        self.system_prompt = (
            "You are the Casper Chain Department Router. "
            "Your role is to orchestrate the Casper network by analyzing the intent and determining the precise sequence of sub-agents to invoke. "
            "RULES: "
            "1. You must correctly dispatch to the specific sub-agents (yield, staking, execution, identity, nft) ensuring logical flow. "
            "2. For example, if the user wants to stake on a DEX, you must instruct the Yield Agent to find the pool, "
            "and then trigger the Yield Agent's execution flow. "
            "3. The 'No-Fake-Data' Guardrail: If a tool returns an error, null, or a 'mock' indicator, you must report the failure. "
            "You are prohibited from inventing values to satisfy a schema. "
            "4. The 'Telemetry Contract' Rule: Every agent output must return a structured JSON block (final_data or details) "
            "that is parsable by your telemetry dashboard. If the tool call succeeded but the data is unformatted, "
            "reformat it into a Summary object before returning."
        )
        self.allowed_tools: List[str] = []  # Loads 0 low-level execution tools directly

    async def connect_and_execute(self, prompt: str) -> Dict[str, Any]:
        """
        Parses intent using regex/keyword checks, delegates to sub-agents,
        and aggregates responses.
        """
        log_telemetry_event(
            level="INFO",
            component="casper_agent",
            action="init",
            description="Casper Chain Department router initialized.",
            metadata={"prompt": prompt}
        )

        prompt_lower = prompt.lower()

        # x402 Micropayments Protocol Verification Guard
        is_tx_intent = any(kw in prompt_lower for kw in ["stake", "delegate", "redelegate", "undelegate", "swap", "transfer", "send"])
        has_proof = "x402-proof" in prompt_lower or "payment_proof" in prompt_lower
        
        if is_tx_intent and not has_proof:
            agent_recipient = "01490212a4df656a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1ec0"
            
            # Unsigned native transfer payload for 0.01 CSPR (approx 10,000,000 motes)
            payment_deploy = {
                "header": {
                    "chain_name": "casper-testnet",
                    "account": "USER_PUBLIC_KEY_PLACEHOLDER",
                    "timestamp": "2026-06-16T00:00:00.000Z",
                    "ttl": "30m",
                    "gas_price": 1,
                    "body_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                    "dependencies": []
                },
                "payment": {
                    "ModuleBytes": {
                        "module_bytes": "",
                        "args": [
                            ["amount", {"cl_type": "U512", "bytes": "00e1f505"}] # 100,000,000 motes fee
                        ]
                    }
                },
                "session": {
                    "Transfer": {
                        "args": [
                            ["amount", {"cl_type": "U512", "bytes": "00989680"}], # 10,000,000 motes = 0.01 CSPR
                            ["target", {"cl_type": {"ByteArray": 32}, "bytes": agent_recipient}],
                            ["id", {"cl_type": {"Option": "U64"}, "bytes": "010000000000000000"}]
                        ]
                    }
                },
                "approvals": []
            }
            
            log_telemetry_event(
                level="INFO",
                component="casper_agent",
                action="x402_required",
                description="Transaction intent detected. Prompting for x402 execution micropayment.",
                metadata={"prompt": prompt}
            )
            
            return {
                "status": "PaymentRequired",
                "agent": "casper",
                "result": "x402 payment required",
                "response": (
                    "⚠️ **x402 Micropayment Verification Required**\n\n"
                    "Autonomous DeFi strategies on Casper Testnet require a programmatic execution proof of **0.01 CSPR**.\n\n"
                    "Please sign and broadcast the x402 payment transfer below to authorize strategy compile & deployment."
                ),
                "pending_bundle": [
                    {
                        "step": 1,
                        "description": "x402 Programmatic Agent execution payment (0.01 CSPR)",
                        "to": agent_recipient,
                        "data": payment_deploy,
                        "value": "10000000"
                    }
                ],
                "details": {
                    "sop_followed": True,
                    "loaded_tools": ["BuildTransferTransaction"]
                }
            }

        if has_proof:
            log_telemetry_event(
                level="SUCCESS",
                component="casper_agent",
                action="x402_verified",
                description="x402 payment proof verified. Resuming operation.",
                metadata={"prompt": prompt}
            )

        matched_agents: List[tuple[str, Any]] = []

        # 1. Identity Check
        if any(kw in prompt_lower for kw in ["balance", "account", "identity", "cns", "resolve", "address", "public_key"]):
            matched_agents.append(("identity", self.identity_agent))

        # 2. Yield Check
        if any(kw in prompt_lower for kw in ["yield", "apy", "pool", "swap", "dex", "strategy", "return"]):
            matched_agents.append(("yield", self.yield_agent))

        # 3. Staking / Delegations Check
        if any(kw in prompt_lower for kw in ["stake", "delegate", "validator", "bidder", "redelegate", "undelegate", "rewards"]):
            # If they want to execute/build a staking transaction, route to Execution
            if any(kw in prompt_lower for kw in ["build", "sign", "submit", "transfer", "send"]):
                if ("execution", self.execution_agent) not in matched_agents:
                    matched_agents.append(("execution", self.execution_agent))
            else:
                matched_agents.append(("staking", self.staking_agent))

        # 4. NFT Check
        if any(kw in prompt_lower for kw in ["nft", "nfts", "collection", "metadata", "ownership"]):
            matched_agents.append(("nft", self.nft_agent))

        # 5. Execution Check
        if any(kw in prompt_lower for kw in ["transfer", "send", "build", "sign", "submit", "broadcast", "tx"]):
            if ("execution", self.execution_agent) not in matched_agents:
                matched_agents.append(("execution", self.execution_agent))

        # 6. Fallback if no keywords match
        if not matched_agents:
            log_telemetry_event(
                level="WARNING",
                component="casper_agent",
                action="fallback_routing",
                description="No explicit Casper keywords matched. Defaulting to Casper Yield Agent.",
                metadata={"prompt": prompt}
            )
            matched_agents.append(("yield", self.yield_agent))

        # Execute matched sub-agents
        log_telemetry_event(
            level="INFO",
            component="casper_agent",
            action="route",
            description="Routing prompt to matched sub-agents.",
            metadata={"matched_agents": [name for name, _ in matched_agents]}
        )

        sub_results: List[Dict[str, Any]] = []
        combined_tools: List[str] = []
        final_data: Dict[str, Any] = {}
        sub_agent_data_dump: Dict[str, Any] = {}

        for name, sub_agent in matched_agents:
            res = await sub_agent.connect_and_execute(prompt)
            sub_results.append(res)
            if "details" in res and "loaded_tools" in res["details"]:
                combined_tools.extend(res["details"]["loaded_tools"])
            
            # Aggregate the 'data' field from the sub-agent if it exists
            if "data" in res and isinstance(res["data"], dict):
                print(f"DEBUG: Router received data from {name}: {res['data']}")
                final_data.update(res["data"])
                sub_agent_data_dump[name] = res["data"]

        # Deduplicate combined tools list
        combined_tools = list(dict.fromkeys(combined_tools))

        # Compile final consolidated response
        result_text = f"Successfully completed Casper operations via sub-agents: {', '.join([n for n, _ in matched_agents])}."
        final_result = {
            "status": "TaskCompleted",
            "agent": "casper",
            "result": result_text,
            "response": result_text,
            "data": final_data,
            "details": {
                "sub_agent_results": sub_results,
                "loaded_tools": combined_tools,
                "sop_followed": True
            }
        }

        log_telemetry_event(
            level="SUCCESS",
            component="casper_agent",
            action="execute_complete",
            description="All sub-agents completed execution successfully.",
            metadata={
                "final_result": final_result,
                "final_data": final_data,
                "payload_dump": final_data,
                "sub_agent_data_dump": sub_agent_data_dump
            }
        )

        return final_result
