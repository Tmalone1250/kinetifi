import re
from typing import Dict, Any, List
from core.observability.decision_log import log_telemetry_event

class SupervisorAgent:
    """
    The Global Orchestrator (The Hub) Agent.
    Evaluates high-level natural language user intents and routes them to the
    appropriate specialist agents (Casper or Mantle) via keyword-based routing.
    Does not load any direct on-chain execution tools.
    """

    def __init__(self) -> None:
        # Define strict regex patterns for routing matching
        self.casper_pattern = re.compile(r"\b(cspr|casper|friendly\s+market)\b", re.IGNORECASE)
        self.mantle_pattern = re.compile(r"\b(mantle|mnt|agni|merchant\s+moe)\b", re.IGNORECASE)

    def delegate_to_casper(self, prompt: str, matched_keywords: List[str]) -> Dict[str, Any]:
        """
        Delegates the user intent to the Casper Specialist Agent.
        """
        log_telemetry_event(
            level="INFO",
            component="supervisor",
            action="handoff",
            description="Routing intent to Casper Specialist Agent.",
            metadata={
                "prompt": prompt,
                "target_agent": "casper",
                "matched_keywords": matched_keywords
            }
        )
        return {
            "status": "delegated",
            "target_agent": "casper",
            "payload": {
                "prompt": prompt
            }
        }

    def delegate_to_mantle(self, prompt: str, matched_keywords: List[str]) -> Dict[str, Any]:
        """
        Delegates the user intent to the Mantle Specialist Agent.
        """
        log_telemetry_event(
            level="INFO",
            component="supervisor",
            action="handoff",
            description="Routing intent to Mantle Specialist Agent.",
            metadata={
                "prompt": prompt,
                "target_agent": "mantle",
                "matched_keywords": matched_keywords
            }
        )
        return {
            "status": "delegated",
            "target_agent": "mantle",
            "payload": {
                "prompt": prompt
            }
        }

    def route_intent(self, prompt: str) -> Dict[str, Any]:
        """
        Performs strict keyword-based routing of the prompt.
        
        Args:
            prompt (str): Natural language user intent.
            
        Returns:
            Dict[str, Any]: Routing result payload outlining delegation status.
        """
        casper_matches = self.casper_pattern.findall(prompt)
        mantle_matches = self.mantle_pattern.findall(prompt)

        # 1. Evaluate routing destinations
        if casper_matches and not mantle_matches:
            return self.delegate_to_casper(prompt, list(set(casper_matches)))
        elif mantle_matches and not casper_matches:
            return self.delegate_to_mantle(prompt, list(set(mantle_matches)))
        elif casper_matches and mantle_matches:
            # Multi-chain or ambiguous request; default routing or split could occur here.
            # In Phase 1 we log a warning and delegate based on primary match or raise error.
            log_telemetry_event(
                level="WARNING",
                component="supervisor",
                action="ambiguous_routing",
                description="Prompt contains triggers for both Casper and Mantle networks.",
                metadata={
                    "prompt": prompt,
                    "casper_matches": list(set(casper_matches)),
                    "mantle_matches": list(set(mantle_matches))
                }
            )
            # Default to Casper in case of ambiguous multi-chain prompt
            return self.delegate_to_casper(prompt, list(set(casper_matches)))
        else:
            # Unroutable prompt
            log_telemetry_event(
                level="ERROR",
                component="supervisor",
                action="unroutable",
                description="Unable to route intent. No network keywords matched.",
                metadata={"prompt": prompt}
            )
            return {
                "status": "error",
                "error": "No matching network keywords found in the prompt.",
                "payload": {
                    "prompt": prompt
                }
            }
