import os
import sys
# Add the root KinetiFi directory to the python path so 'core' can be resolved
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

import asyncio
import json
from typing import Dict, Any
from core.observability.decision_log import log_telemetry_event
from core.agents.mantle_yield_agent import MantleYieldAgent
from core.agents.mantle_identity_agent import MantleIdentityAgent

class MantleChainRouter:
    """
    The Mantle Chain Router.
    Analyzes intent and delegates to specialized agents. Never touches the blockchain directly.
    """

    def __init__(self):
        log_telemetry_event(
            level="INFO",
            component="mantle_chain_router",
            action="init",
            description="Initializing Mantle Chain Router.",
            metadata={}
        )

    async def connect_and_execute(self, prompt: str) -> Dict[str, Any]:
        """
        Processes a delegated intent and routes to sub-agents.
        """
        log_telemetry_event(
            level="INFO",
            component="mantle_chain_router",
            action="route",
            description="Routing intent for Mantle network.",
            metadata={"prompt": prompt}
        )

        final_data = {}
        sub_results = {}
        prompt_lower = prompt.lower()
        
        # Check for Yield/DEX intent
        yield_keywords = ["yield", "meth", "usdy", "quote", "swap", "agni", "moe"]
        if any(kw in prompt_lower for kw in yield_keywords):
            yield_agent = MantleYieldAgent()
            res = await yield_agent.execute(prompt)
            final_data.update(res.get("results", {}))
            sub_results["mantle_yield_agent"] = res
            
        # Check for Identity intent
        identity_keywords = ["identity", "erc8004", "profile", "reputation", "register"]
        if any(kw in prompt_lower for kw in identity_keywords):
            identity_agent = MantleIdentityAgent()
            res = await identity_agent.execute(prompt)
            final_data["identity_data"] = res.get("results", {})
            sub_results["mantle_identity_agent"] = res

        return {
            "status": "TaskCompleted",
            "agent": "mantle_chain_router",
            "data": final_data,
            "details": {
                "sub_agent_results": sub_results,
                "zero_trust_enforced": True
            }
        }

if __name__ == "__main__":
    async def main():
        print("Testing MantleChainRouter...")
        router = MantleChainRouter()
        res = await router.connect_and_execute("Register my ERC-8004 identity and check my reputation score.")
        print("\nRouter Result:\n" + json.dumps(res, indent=2))
    
    asyncio.run(main())
