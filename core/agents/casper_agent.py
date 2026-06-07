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
            "Your role is to analyze the prompt, route to the correct sub-agent(s), "
            "and combine the results of their execution."
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

        matched_agents: List[tuple[str, Any]] = []
        prompt_lower = prompt.lower()

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

        for name, sub_agent in matched_agents:
            res = await sub_agent.connect_and_execute(prompt)
            sub_results.append(res)
            if "details" in res and "loaded_tools" in res["details"]:
                combined_tools.extend(res["details"]["loaded_tools"])

        # Deduplicate combined tools list
        combined_tools = list(dict.fromkeys(combined_tools))

        # Compile final consolidated response
        final_result = {
            "status": "TaskCompleted",
            "agent": "casper",
            "result": f"Successfully completed Casper operations via sub-agents: {', '.join([n for n, _ in matched_agents])}.",
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
            metadata={"final_result": final_result}
        )

        return final_result
