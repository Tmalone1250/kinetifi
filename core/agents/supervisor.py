from typing import Annotated, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.types import interrupt
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from core.agents.schemas import SupervisorState, FindApyIntent, SubAgentRequest
from core.observability.decision_log import log_telemetry_event
from core.agents.mantle_agent import MantleChainRouter
from core.agents.casper_agent import CasperSpecialistAgent
from core.agents.sub_agents.mantle.mantle_execution_agent import MantleExecutionAgent

import json
import os

# Setup LLM using local Ollama via OpenAI-compatible endpoint
llm = ChatOpenAI(
    model=os.getenv("INTENT_MODEL", "qwen2.5:7b"),
    base_url=f"{os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')}/v1",
    api_key="ollama",
    temperature=0
)

SYSTEM_PROMPT = """PRIMARY DIRECTIVE: Evaluate intent and gather missing variables conversationally. NEVER guess missing parameters like the target network. If a required field is missing, ask the user. Confirm understanding before routing.

INTENT CLASSIFICATION RULES:
- "find_best_apy": Use when the user asks to find yields, APY, or returns.
- "execute_transaction": Use when the user asks to supply, invest, generate a bundle, or execute a strategy.
- "general_chat": Use for portfolio questions, identity verification, or general questions."""

import re

def parse_simple_answer(answer: str) -> str:
    """Lightweight parser for single-word answers like 'Mantle'."""
    cleaned = str(answer).strip().lower()
    if "mantle" in cleaned or "agni" in cleaned:
        return "mantle"
    if "casper" in cleaned or "cspr" in cleaned:
        return "casper"
    return cleaned  # Fallback

def evaluate_intent(state: SupervisorState):
    """
    Evaluates the intent from the conversation messages.
    If it's find_best_apy or execute_transaction and network is missing, it returns handoff_ready: False.
    """
    messages = state.get("messages", [])
    
    # We use structured output to force the LLM to parse into FindApyIntent
    structured_llm = llm.with_structured_output(FindApyIntent)
    
    # Prepend system prompt
    call_messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
    
    intent_parsed = structured_llm.invoke(call_messages)
    
    # Ensure network is explicitly None if not valid
    if intent_parsed.network not in ["mantle", "casper"]:
        intent_parsed.network = None
    
    log_telemetry_event(
        level="INFO",
        component="supervisor",
        action="evaluate_intent",
        description="Parsed intent using structured output.",
        metadata={"parsed": intent_parsed.dict()}
    )
    
    if intent_parsed.intent in ["find_best_apy", "execute_transaction"] and not intent_parsed.network:
        return {
            "intent": intent_parsed,
            "handoff_ready": False
        }
        
    return {
        "intent": intent_parsed,
        "handoff_ready": True,
        "sub_agent": intent_parsed.network
    }

def gather_params(state: SupervisorState):
    """
    Handles resumption. Captures the deterministic resumed value.
    Uses Pydantic re-instantiation (not mutation) to correctly trigger LangGraph state update.
    """
    current_intent = state.get("intent")

    # Explicitly pause the graph and capture the deterministic resumed value
    user_reply = interrupt("Which network would you like to use, Mantle or Casper?")
    parsed_network = parse_simple_answer(user_reply)

    if parsed_network not in ["mantle", "casper"]:
        user_reply = interrupt("I didn't quite catch that. Which network would you like to use, Mantle or Casper?")
        parsed_network = parse_simple_answer(user_reply)

    # CRITICAL FIX: Create a NEW Pydantic instance to trigger state update
    # Mutating current_intent.network = "mantle" does NOT work with LangGraph state.
    updated_intent = FindApyIntent(
        network=parsed_network,
        **current_intent.model_dump(exclude={"network"})
    )

    return {
        "intent": updated_intent,
        "clarified_params": {},  # Clear the interrupt flag
        "handoff_ready": True,
        "sub_agent": parsed_network
    }

async def generate_bundle(state: SupervisorState):
    """
    Routes the enriched context to the correct sub-agent to generate the bundle.
    """
    intent = state.get("intent")
    if not intent or not state.get("sub_agent"):
        # Not a recognizable intent or no sub-agent, just respond normally
        response = llm.invoke([SystemMessage(content=SYSTEM_PROMPT)] + state.get("messages", []))
        return {"messages": [response]}
        
    original_intent = state.get("messages", [HumanMessage(content="")])[0].content
    
    req = SubAgentRequest(
        original_intent=original_intent,
        parsed_intent=intent.dict(),
        clarified_params=state.get("clarified_params", {}),
        execution_metadata={"routed_from": "supervisor"},
        wallet_address=state.get("wallet_address")
    )
    
    log_telemetry_event(
        level="SUCCESS",
        component="supervisor",
        action="generate_bundle",
        description=f"Routing fully enriched request to {state['sub_agent']}.",
        metadata={"payload": req.dict()}
    )
    
    target = state["sub_agent"]
    
    # We invoke the underlying router (simulated async call here)
    # Note: In a real environment, you might wait for the subagent's actual result.
    if target == "mantle":
        router = MantleChainRouter(agent_identity_id=1)
        result = await router.connect_and_execute(handoff_payload=req.dict(), decision_hash="0x0")
        
        pending_bundle = result.get("pending_bundle")
        
        return {
            "messages": [{"role": "ai", "content": result.get("response", "Done.")}],
            "pending_bundle": pending_bundle
        }
    elif target == "casper":
        prompt = f"Execute this intent on Casper: {intent.intent}"
        router = CasperSpecialistAgent()
        result = await router.connect_and_execute(prompt=prompt)
        return {
            "messages": [{"role": "ai", "content": result.get("response") or result.get("result") or "Done."}],
            "pending_bundle": result.get("pending_bundle")
        }
        
    return {"messages": [{"role": "ai", "content": f"Routed to {target}."}]}



# Build Graph
builder = StateGraph(SupervisorState)

builder.add_node("evaluate_intent", evaluate_intent)
builder.add_node("gather_params", gather_params)
builder.add_node("generate_bundle", generate_bundle)

builder.add_edge(START, "evaluate_intent")

def route_evaluation(state: SupervisorState):
    if state.get("handoff_ready"):
        return "generate_bundle"
    return "gather_params"

builder.add_conditional_edges("evaluate_intent", route_evaluation)

def route_gather(state: SupervisorState):
    if state.get("handoff_ready"):
        return "generate_bundle"
    # If not ready, it means we interrupted again
    return END

builder.add_conditional_edges("gather_params", route_gather)

builder.add_edge("generate_bundle", END)

import sqlite3

import sqlite3

# Initialize SqliteSaver globally
conn = sqlite3.connect("kinetifi_agents.db", check_same_thread=False)
checkpointer = SqliteSaver(conn)
checkpointer.setup()
supervisor_graph = builder.compile(checkpointer=checkpointer)
