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
        
        self.system_prompt = (
            "You are the Global Orchestrator (The Hub) Agent. "
            "Your role is to evaluate high-level natural language user intents and route them to the appropriate specialist agents (Casper or Mantle). "
            "RULES: "
            "1. You do not construct transactions or interact with the blockchain directly. "
            "2. Ensure that multi-step intents (e.g., 'Find the best APY and stake it') are forwarded fully intact to the Chain Specialist. "
            "3. The 'Chain Isolation' Rule: If a prompt contains keywords for multiple chains (e.g., 'Move CSPR to Mantle'), "
            "you must explicitly split the task into two sub-tasks, one for the CasperAgent and one for the MantleAgent, "
            "and wait for both before synthesizing a final response. "
            "4. The 'No-Fake-Data' Guardrail: If a tool returns an error, null, or a 'mock' indicator, you must report the failure. "
            "You are prohibited from inventing values to satisfy a schema. "
            "5. The 'Telemetry Contract' Rule: Every agent output must return a structured JSON block (final_data or details) "
            "that is parsable by your telemetry dashboard. If the tool call succeeded but the data is unformatted, "
            "reformat it into a Summary object before returning."
        )

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
