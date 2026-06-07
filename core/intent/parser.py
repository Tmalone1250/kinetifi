import re
import json
import httpx
import logging
from core.intent.models import ParsedIntent, StepExecution
from core.observability.decision_log import log_telemetry_event

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2.5:7b"

logger = logging.getLogger(__name__)

def fallback_parse(user_prompt: str):

    # Regex for: "swap <amount> <token> to <token>"
    swap_pattern = re.compile(r"(?i)swap\s+([\d\.]+)\s+([A-Za-z0-9]+)\s+(?:to|for)\s+([A-Za-z0-9]+)")
    match = swap_pattern.search(user_prompt)
    if match:
        amount, from_token, to_token = match.groups()
        return ParsedIntent(
            rationale="Deterministic regex fallback triggered for swap intent.",
            execution_plan=[
                StepExecution(
                    step=1,
                    action="swap",
                    params={
                        "amount": amount,
                        "from_token": from_token.upper(),
                        "to_token": to_token.upper()
                    }
                )
            ]
        )
    return None

async def parse_intent(user_prompt: str) -> ParsedIntent:

    # 1. Try deterministic fallback
    logger.info("Executing regex-based fallback engine.")
    try:
        intent = fallback_parse(user_prompt)
        if intent:
            log_telemetry_event(
                level="SUCCESS",
                component="intent_parser",
                action="fallback_parse",
                description="Parsed user intent using regex fallback.",
                metadata={"prompt": user_prompt, "rationale": intent.rationale, "plan_length": len(intent.execution_plan)}
            )
            return intent
    except Exception as e:
        logger.error(f"Fallback parser failed: {e}")
        log_telemetry_event(
            level="ERROR",
            component="intent_parser",
            action="fallback_parse",
            description=f"Fallback parser failed: {e}",
            metadata={"prompt": user_prompt}
        )
        raise
        
    logger.info("Regex fallback failed. Routing to Ollama LLM.")
    
    schema = ParsedIntent.model_json_schema()
    
    # Construct a strict prompt incorporating the JSON schema
    system_instructions = (
        "You are an AI Intent Parser for KinetiFi, a specialized DeFi agent. "
        "Your job is to translate the user's natural language request into a precise execution plan. "
        f"You MUST return ONLY valid JSON that precisely matches the following JSON schema: {json.dumps(schema)}. "
        f"Do not include markdown blocks or any other text. User Prompt: {user_prompt}"
    )
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": system_instructions,
                "stream": False,
                "format": "json"
            },
            timeout=30.0
        )
        response.raise_for_status()
        
        data = response.json()
        raw_llm_response = data.get("response", "{}")
        
        # Pydantic validates the incoming raw JSON string securely
        intent = ParsedIntent.model_validate_json(raw_llm_response)
        log_telemetry_event(
            level="SUCCESS",
            component="intent_parser",
            action="ollama_parse",
            description="Parsed user intent using LLM.",
            metadata={"prompt": user_prompt, "rationale": intent.rationale, "plan_length": len(intent.execution_plan)}
        )
        return intent