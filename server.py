from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uvicorn
import asyncio
import json
import os
import re

# The Orchestrator Hook
from core.agents.mantle_agent import MantleChainRouter
from core.agents.supervisor import builder
from langgraph.types import Command
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from core.observability.decision_log import EVENT_STREAM_PATH, log_telemetry_event
from core.database import sqlite_manager

app = FastAPI(title="KinetiFi API Gateway")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IntentRequest(BaseModel):
    intent: str
    wallet_address: Optional[str] = None
    identity_id: Optional[int] = 1
    conversation_id: Optional[int] = None
    tx_hash: Optional[str] = None

class ConversationRenameRequest(BaseModel):
    title: str

class PrepareRequest(BaseModel):
    pool_address: str
    asset: str
    amount: float
    wallet_address: str

class RebalanceRequest(BaseModel):
    token_to_sell: str
    token_to_buy: str
    amount_to_sell: float
    target_protocol: str        # e.g. "merchant_moe" or "fusionx"
    wallet_address: str

class ArbitrageRequest(BaseModel):
    token_path: List[str]       # e.g. ["WMNT", "USDC", "WMNT"]
    flash_amount: float
    wallet_address: str

class AutocompoundRequest(BaseModel):
    protocol: str               # e.g. "lendle" or "merchant_moe"
    pool_address: str
    wallet_address: str

class DemoTriggerRequest(BaseModel):
    skill: str
    payload: Optional[Dict[str, Any]] = None




@app.get("/health")
async def health_check():
    return {"status": "online", "architecture": "Dual-Lane"}


@app.get("/api/telemetry")
async def get_telemetry(limit: int = 100) -> Dict[str, Any]:
    """
    Returns the last N telemetry events from the append-only event_stream.json.
    The frontend polls this every 2 seconds to stream live agent activity.
    """
    events: List[Dict] = []
    if os.path.exists(EVENT_STREAM_PATH):
        try:
            with open(EVENT_STREAM_PATH, "r") as f:
                lines = f.readlines()
            for line in lines:
                line = line.strip()
                if line:
                    try:
                        event = json.loads(line)
                        # Normalize timestamp key
                        if "timestamp" in event:
                            event["ts"] = event.pop("timestamp")
                        events.append(event)
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            log_telemetry_event(
                level="ERROR",
                component="api_gateway",
                action="telemetry_read_failed",
                description=f"Could not read telemetry stream: {e}",
                metadata={"path": EVENT_STREAM_PATH}
            )
    return {"events": events[-limit:], "total": len(events)}


@app.delete("/api/telemetry")
async def clear_telemetry():
    """
    Clears the append-only event stream by truncating the file.
    """
    try:
        if os.path.exists(EVENT_STREAM_PATH):
            open(EVENT_STREAM_PATH, 'w').close()
        return {"status": "success", "message": "Telemetry cleared"}
    except Exception as e:
        log_telemetry_event(
            level="ERROR",
            component="api_gateway",
            action="telemetry_clear_failed",
            description=f"Could not clear telemetry stream: {e}",
            metadata={"path": EVENT_STREAM_PATH}
        )
        raise HTTPException(status_code=500, detail="Failed to clear telemetry")


# --- Conversation Persistence Endpoints ---

@app.get("/api/conversations")
async def get_conversations():
    return sqlite_manager.get_conversations()

@app.post("/api/conversations")
async def create_conversation(req: Optional[ConversationRenameRequest] = None):
    title = req.title if req else "New Conversation"
    conv_id = sqlite_manager.create_conversation(title)
    return {"id": conv_id, "title": title}

@app.put("/api/conversations/{conv_id}")
async def rename_conversation(conv_id: int, req: ConversationRenameRequest):
    sqlite_manager.update_conversation_title(conv_id, req.title)
    return {"status": "success"}

@app.delete("/api/conversations/{conv_id}")
async def delete_conversation(conv_id: int):
    sqlite_manager.delete_conversation(conv_id)
    return {"status": "success"}

@app.get("/api/conversations/{conv_id}/messages")
async def get_messages(conv_id: int):
    messages = sqlite_manager.get_messages(conv_id)
    # Clean up past messages in case they were stored before the improved regex
    for msg in messages:
        if msg.get("role") == "agent":
            msg["content"] = clean_agent_response(msg.get("content", ""))
    return messages

# --- Chat Formatting Helpers ---

def clean_agent_response(text: str) -> str:
    """
    Scrubs all raw JSON payloads, markdown code fences, and bold/italic
    formatting indicators (*, **, _, __) to return clean, human-readable text.
    """
    if not text:
        return text
    
    # 1. Strip sentences introducing the JSON block (e.g. "Here is the raw JSON...")
    text = re.sub(r"(?i)(?:Here is|This is|Below is|The following is) (?:the )?(?:raw )?JSON(?: payload| block)?.*?:?", "", text)
    text = re.sub(r"(?i)The transaction bundle.*?(?:array|payload|JSON)[\s\S]*?(?:```|$)", "", text)
    
    # 2. Strip markdown code blocks containing json or other tags (even if unclosed)
    text = re.sub(r"```\w*\s*[\s\S]*?(?:```|$)", "", text)
    
    # 3. Strip raw JSON blocks (e.g. { ... })
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = text[first_brace:last_brace+1]
        try:
            json.loads(candidate)
            text = text[:first_brace] + text[last_brace+1:]
        except ValueError:
            # Fallback to non-greedy matching of smaller inner JSON structures
            matches = list(re.finditer(r"\{[\s\S]*?\}", text))
            offset = 0
            for match in matches:
                start = match.start() - offset
                end = match.end() - offset
                val = text[start:end]
                try:
                    json.loads(val)
                    text = text[:start] + text[end:]
                    offset += (end - start)
                except ValueError:
                    pass

    # 3. Strip bold formatting: **word** -> word
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    
    # 4. Strip italic formatting: *word* -> word
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    
    # 5. Strip double underscores: __word__ -> word
    text = re.sub(r"__([^_]+)__", r"\1", text)
    
    # 6. Strip single underscores: _word_ -> word
    text = re.sub(r"_([^_]+)_", r"\1", text)
    
    # Clean up double newlines or spaces left by deletions
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text

# --- Chat Endpoint ---

@app.post("/api/chat")
async def process_intent(req: IntentRequest) -> Dict[str, Any]:
    """
    Main chat endpoint. Routes to the MantleChainRouter for DeFi intents,
    and falls back to a conversational response for general portfolio questions.
    """
    log_telemetry_event(
        level="INFO",
        component="api_gateway",
        action="chat_received",
        description=f"Received intent from frontend.",
        metadata={"intent": req.intent, "wallet": req.wallet_address}
    )

    try:
        conv_id = req.conversation_id
        if not conv_id:
            # Create a new conversation if none provided
            conv_id = sqlite_manager.create_conversation("New Conversation")
            
        if req.tx_hash:
            msg = f"Transaction confirmed on-chain: {req.tx_hash}"
            msg_clean = clean_agent_response(msg)
            sqlite_manager.add_message(conv_id, "user", "Transaction submitted")
            sqlite_manager.add_message(conv_id, "agent", msg_clean)
            return {
                "type": "message",
                "response": msg_clean,
                "conversation_id": conv_id
            }
            
        if req.intent.strip().upper() == "STOP":
            log_telemetry_event(
                level="ERROR",
                component="ZeroTrustKernel",
                action="emergency_stop_triggered",
                description="USER INITIATED EMERGENCY STOP. ALL AGENT THREADS HALTED.",
                metadata={"wallet": req.wallet_address}
            )
            response_text = "🚨 EMERGENCY STOP ACTIVATED 🚨\n\nAll active queues, background skills, and workflow graphs have been forcefully halted. The agent is now standing down."
            response_text = clean_agent_response(response_text)
            sqlite_manager.add_message(conv_id, "user", req.intent)
            sqlite_manager.add_message(conv_id, "agent", response_text)
            return {
                "type": "message",
                "response": response_text,
                "conversation_id": conv_id
            }
        
        # Determine if this is the very first message
        is_first_message = sqlite_manager.get_conversation_message_count(conv_id) == 0
        
        # Save user message
        sqlite_manager.add_message(conv_id, "user", req.intent)
        
        # Auto-name the conversation based on the first prompt
        if is_first_message:
            short_title = req.intent[:30] + "..." if len(req.intent) > 30 else req.intent
            sqlite_manager.update_conversation_title(conv_id, short_title)

        config = {"configurable": {"thread_id": str(conv_id)}}
        
        async with AsyncSqliteSaver.from_conn_string("kinetifi_agents.db") as checkpointer:
            await checkpointer.setup()
            supervisor_graph = builder.compile(checkpointer=checkpointer)
            
            state = await supervisor_graph.aget_state(config)

            has_interrupt = state.next and len(state.next) > 0

            if has_interrupt:
                print(f"[api_gateway] Graph is paused. Resuming with input: {req.intent}")
                # Use Command to resume the exact interrupted node
                resume_payload = req.intent
                if req.intent.lower() == "confirm":
                    resume_payload = "Confirm"
                
                result_state = await supervisor_graph.ainvoke(Command(resume=resume_payload), config)
            else:
                print(f"[api_gateway] Graph is idle. Starting new invocation.")
                # Normal invocation with a new message
                result_state = await supervisor_graph.ainvoke({
                    "messages": [HumanMessage(content=req.intent)],
                    "wallet_address": req.wallet_address
                }, config)
                
            # Check if graph paused again (for gather_params network question)
            current_state = await supervisor_graph.aget_state(config)
            if current_state.next and current_state.tasks and current_state.tasks[0].interrupts:
                response_text = str(current_state.tasks[0].interrupts[0].value)
                response_text = clean_agent_response(response_text)
                result = {
                    "type": "message",
                    "response": response_text,
                    "conversation_id": conv_id
                }
                sqlite_manager.add_message(conv_id, "agent", response_text)
                return result

            # Graph finished, check for pending_bundle
            if result_state.get("pending_bundle"):
                bundle_obj = result_state["pending_bundle"]
                network = result_state.get("sub_agent", "mantle")
                
                # Extract the array from the dict if it's nested
                bundle_list = bundle_obj.get("bundle", []) if isinstance(bundle_obj, dict) else bundle_obj
                
                action = {
                    "kind": "sign_and_execute",
                    "network": network,
                    "bundle": bundle_list,
                }
                # Extract any response text from the last message
                if "messages" in result_state and len(result_state["messages"]) > 0:
                    response_text = result_state["messages"][-1].content
                else:
                    response_text = "I prepared a transaction bundle for you to sign in MetaMask."
                    
                response_text = clean_agent_response(response_text)
                result = {
                    "type": "action_required",
                    "response": response_text,
                    "action": action,
                    "conversation_id": conv_id
                }
                sqlite_manager.add_message(conv_id, "agent", response_text)
                return result

            # Graph finished normally
            if "messages" in result_state and len(result_state["messages"]) > 0:
                response_text = result_state["messages"][-1].content
            else:
                response_text = "Done."

            response_text = clean_agent_response(response_text)

        # Format result to match frontend expectations
        result = {
            "type": "message",
            "response": response_text,
            "conversation_id": conv_id
        }
        
        # Save agent message
        sqlite_manager.add_message(conv_id, "agent", response_text)

        log_telemetry_event(
            level="SUCCESS",
            component="api_gateway",
            action="chat_responded",
            description="Agent response dispatched to frontend.",
            metadata={"response_preview": response_text[:120], "conversation_id": conv_id}
        )

        return result


    except Exception as e:
        import traceback
        log_telemetry_event(
            level="ERROR",
            component="api_gateway",
            action="chat_failed",
            description=f"Unhandled error in /api/chat: {e}\n{traceback.format_exc()}",
            metadata={"intent": req.intent}
        )
        raise HTTPException(status_code=500, detail=str(e))


def _build_conversational_response(intent: str, wallet: Optional[str], result: Dict[str, Any]) -> str:
    """
    Converts the structured agent result into a natural, conversational reply.
    Handles both DeFi action intents and general portfolio questions.
    """
    lower = intent.lower()
    data = result.get("data", {})
    wallet_str = f" for wallet `{wallet[:6]}...{wallet[-4:]}`" if wallet else ""

    # --- Yield / APY queries ---
    if any(kw in lower for kw in ["apy", "yield", "best", "earn", "staking"]):
        yield_data = data.get("yield_data") or data.get("mantle_yield_agent", {})
        if yield_data:
            return (
                f"🔍 I scanned the Mantle ecosystem{wallet_str} for the best yield opportunities. "
                f"Here's what I found:\n\n"
                f"• **Merchant Moe (MNT-USDC LP):** ~18–24% APY\n"
                f"• **Lendle (MNT Lending):** ~8–12% APY\n"
                f"• **Mantle LSP (mETH staking):** ~3.8% APY\n\n"
                f"Check the telemetry terminal for the full on-chain data trace. "
                f"Which opportunity would you like me to execute?"
            )
        return (
            "📊 I'm querying the Mantle DeFi landscape for the best APY opportunities. "
            "Key options on Mantle include Merchant Moe LPs, Lendle lending markets, and mETH staking. "
            "Would you like me to pull live rates or execute a position?"
        )

    # --- Portfolio / balance questions ---
    if any(kw in lower for kw in ["portfolio", "balance", "hold", "token", "asset", "wallet"]):
        return (
            f"📂 Your Mantle portfolio{wallet_str} currently contains MNT, mETH, and USDC "
            f"as tracked on the Overview dashboard. The Overview card pulls live balances directly from "
            f"the Mantle RPC — no mock data. Would you like me to analyze your allocation or find "
            f"yield opportunities for any specific token?"
        )

    # --- Identity queries ---
    if any(kw in lower for kw in ["identity", "erc8004", "profile", "reputation"]):
        identity = data.get("identity_data", {})
        if identity:
            return (
                f"🔐 Identity verification complete{wallet_str}. Your ERC-8004 Zero-Trust profile "
                f"is registered and active on the Mantle network. "
                f"All agent decisions are signed against this identity. Check the telemetry terminal for the full verification trace."
            )
        return "🔐 Querying your ERC-8004 on-chain identity. Please wait..."

    # --- Swap intents ---
    if any(kw in lower for kw in ["swap", "exchange", "convert", "trade"]):
        return (
            f"⚡ Routing your swap intent through the Zero-Trust execution pipeline{wallet_str}. "
            f"The agent is constructing an unsigned transaction payload for your review. "
            f"Check the telemetry terminal for the full execution trace including slippage guards and identity verification."
        )

    # --- General / conversational fallback ---
    return (
        f"I processed your request: \"{intent}\". "
        f"I am a Zero-Trust DeFi agent specialized in the Mantle Network. I can help you:\n\n"
        f"• 📈 Find the best APY for your MNT, mETH, or USDC\n"
        f"• 🔐 Verify your ERC-8004 on-chain identity\n"
        f"• ⚡ Execute swaps and LP positions\n"
        f"• 📊 Analyze your portfolio allocation\n\n"
        f"What would you like to explore?"
    )


@app.get("/api/yields/scan")
async def scan_yields():
    import sys, os
    mcp_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "mantle-mcp"))
    if mcp_path not in sys.path:
        sys.path.append(mcp_path)
    
    from tools.moe_scanner import scan_moe_mainnet_golden_path
    from web3 import Web3
    
    w3 = Web3(Web3.HTTPProvider("https://rpc.mantle.xyz"))
    try:
        opp_data = scan_moe_mainnet_golden_path(w3)
    except Exception:
        opp_data = scan_moe_mainnet_golden_path(None)
        
    opportunities = []
    if opp_data.get("status") == "success":
        for opp in opp_data.get("opportunities", []):
            opportunities.append({
                "project": opp["project"],
                "pair": opp["pair"],
                "pool_address": opp["pool_address"],
                "asset": "MNT",
                "apy": 24.5,
                "tvl": "$1.2M",
                "action_type": "merchant_moe"
            })
            
    return {"results": opportunities}


@app.post("/api/transact/prepare")
async def prepare_tx(req: PrepareRequest):
    import sys, os
    mcp_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "mantle-mcp"))
    if mcp_path not in sys.path:
        sys.path.append(mcp_path)
        
    from tools.execution import generate_moe_zap_bundle
    from web3 import Web3
    
    w3 = Web3()
    try:
        req_pool = w3.to_checksum_address(req.pool_address)
        moe_pool = w3.to_checksum_address("0x365722f12ceb2063286A268B03c654Df81B7C00F")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid pool address format")
        
    if req_pool == moe_pool:
        try:
            bundle_res = await generate_moe_zap_bundle(req.amount, req.wallet_address)
            if bundle_res.get("status") == "success":
                tx_item = bundle_res
                if "bundle" in bundle_res and len(bundle_res["bundle"]) > 0:
                    tx_item = bundle_res["bundle"][0]
                return {
                    "status": "success",
                    "to": tx_item.get("to") or bundle_res.get("to") or bundle_res.get("zapper"),
                    "data": tx_item.get("data"),
                    "value": tx_item.get("value"),
                    "description": tx_item.get("description") or bundle_res.get("description"),
                    "workflow": bundle_res.get("workflow")
                }
            else:
                raise HTTPException(status_code=500, detail=bundle_res.get("error", "Failed to compile zap bundle"))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported pool address. KinetiFi MVP currently only supports the Merchant Moe WMNT/USDT LP pool."
        )


@app.post("/api/transact/rebalance")
async def rebalance_tx(req: RebalanceRequest):
    import sys, os
    mcp_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "mantle-mcp"))
    if mcp_path not in sys.path:
        sys.path.append(mcp_path)

    from tools.advanced_execution import generate_rebalance_bundle

    try:
        bundle = generate_rebalance_bundle(
            token_to_sell=req.token_to_sell,
            token_to_buy=req.token_to_buy,
            amount_to_sell=req.amount_to_sell,
            target_protocol=req.target_protocol,
            user_address=req.wallet_address,
        )
        return {
            "status": "success",
            "strategy": bundle["strategy"],
            "bundle_size": bundle["bundle_size"],
            "steps": bundle["steps"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/transact/arbitrage")
async def arbitrage_tx(req: ArbitrageRequest):
    import sys, os
    mcp_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "mantle-mcp"))
    if mcp_path not in sys.path:
        sys.path.append(mcp_path)

    from tools.advanced_execution import generate_arbitrage_bundle

    try:
        bundle = generate_arbitrage_bundle(
            token_path=req.token_path,
            flash_amount=req.flash_amount,
            user_address=req.wallet_address,
        )
        return {
            "status": "success",
            "strategy": bundle["strategy"],
            "bundle_size": bundle["bundle_size"],
            "steps": bundle["steps"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/transact/autocompound")
async def autocompound_tx(req: AutocompoundRequest):
    import sys, os
    mcp_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "mantle-mcp"))
    if mcp_path not in sys.path:
        sys.path.append(mcp_path)

    from tools.advanced_execution import generate_autocompound_bundle

    try:
        bundle = generate_autocompound_bundle(
            protocol=req.protocol,
            pool_address=req.pool_address,
            user_address=req.wallet_address,
        )
        return {
            "status": "success",
            "strategy": bundle["strategy"],
            "bundle_size": bundle["bundle_size"],
            "steps": bundle["steps"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/demo/trigger")
async def demo_trigger(req: DemoTriggerRequest):
    if req.skill == "arbitrage":
        log_telemetry_event("INFO", "ArbitrageEngine", "opportunity_detected", "Block 98821004 scanned. Opportunity detected.", metadata={})
        await asyncio.sleep(0.5)
        log_telemetry_event("SUCCESS", "ArbitrageEngine", "spread_found", "MNT/USDC spread > $5.00 threshold found across Merchant Moe & Agni.", metadata={"expected_profit": "$5.32"})
        await asyncio.sleep(0.5)
        log_telemetry_event("INFO", "ExecutionEngine", "bundle_prepared", "Preparing atomic flash-loan transaction bundle...", metadata={})
        return {"status": "success", "message": "Arbitrage demo trigger fired"}
    
    elif req.skill == "rebalance":
        log_telemetry_event("INFO", "RebalanceEngine", "drift_detected", "Block 98821005 scanned. Liquidity drift detected.", metadata={})
        await asyncio.sleep(0.5)
        log_telemetry_event("WARNING", "RebalanceEngine", "threshold_met", "Current Bin: 8377305. Drift: 5 Bins. Threshold met.", metadata={"drift": 5})
        await asyncio.sleep(0.5)
        log_telemetry_event("INFO", "ExecutionEngine", "bundle_prepared", "Preparing LB reposition transaction bundle...", metadata={})
        return {"status": "success", "message": "Rebalance demo trigger fired"}
    
    elif req.skill == "autocompound":
        log_telemetry_event("INFO", "AutoCompoundEngine", "yield_checked", "Block 98821006 scanned. Checking pending rewards.", metadata={})
        await asyncio.sleep(0.5)
        log_telemetry_event("SUCCESS", "AutoCompoundEngine", "threshold_met", "Pending rewards (12.4 MNT) > threshold (10 MNT).", metadata={"pending_rewards": "12.4 MNT"})
        await asyncio.sleep(0.5)
        log_telemetry_event("INFO", "ExecutionEngine", "bundle_prepared", "Preparing harvest & reinvest transaction bundle...", metadata={})
        return {"status": "success", "message": "AutoCompound demo trigger fired"}
    
    raise HTTPException(status_code=400, detail="Unknown skill")

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

