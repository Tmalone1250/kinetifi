from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Dict, Any
from langgraph.graph.message import add_messages
from typing import Annotated, TypedDict

class FindApyIntent(BaseModel):
    intent: Literal["find_best_apy", "execute_transaction", "general_chat"] = Field(
        ...,
        description="Categorize the user's intent. Use 'find_best_apy' for yield queries, 'execute_transaction' for supply/invest/bundle generation, and 'general_chat' for others."
    )
    network: Optional[Literal["mantle", "casper"]] = Field(None)
    min_tvl_usd: Optional[float] = Field(None)

class SubAgentRequest(BaseModel):
    original_intent: str
    parsed_intent: dict
    clarified_params: dict
    execution_metadata: dict
    wallet_address: Optional[str] = None

class SupervisorState(TypedDict):
    messages: Annotated[list, add_messages]
    intent: Optional[FindApyIntent]
    clarified_params: dict
    handoff_ready: bool
    sub_agent: Optional[str]
    wallet_address: Optional[str]
    pending_bundle: Optional[dict]
    execution_approved: bool
