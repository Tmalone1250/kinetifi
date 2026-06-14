import os
import json
from typing import Dict, Any
from web3 import Web3
from dotenv import load_dotenv
from core.observability.decision_log import log_telemetry_event

class MantleExecutionAgent:
    """
    The Mantle Execution Agent ("Hands" Layer).
    Receives strictly typed, unsigned JSON payloads and signs/broadcasts them via web3.py.
    Does NOT do price discovery or routing.
    """

    def __init__(self):
        load_dotenv()
        rpc_url = os.getenv("MANTLE_RPC_URL", "https://rpc.mantle.xyz")
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.private_key = os.getenv("MANTLE_PRIVATE_KEY")

    def execute_payload(self, agent_identity_id: int, session_id: str, decision_hash: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a pre-built, unsigned transaction handed to it after policy checks pass.
        Returns append-only deterministic logging keyed strictly by identity, session, decision, and tx.
        """
        log_telemetry_event(
            level="INFO",
            component="mantle_execution_agent",
            action="receive_payload",
            description="Received execution payload.",
            metadata={
                "agent_identity_id": agent_identity_id,
                "session_id": session_id,
                "decision_hash": decision_hash,
                "payload_to": payload.get("to"),
            }
        )

        if not self.private_key:
            error_msg = "MANTLE_PRIVATE_KEY is missing from environment."
            log_telemetry_event(
                level="ERROR",
                component="mantle_execution_agent",
                action="execution_reverted",
                description=error_msg,
                metadata={}
            )
            return {"status": "failed", "error": error_msg}

        try:
            account = self.w3.eth.account.from_key(self.private_key)
            nonce = self.w3.eth.get_transaction_count(account.address)
            
            value_raw = payload.get('value', 0)
            if isinstance(value_raw, str):
                if value_raw.startswith("0x"):
                    value = int(value_raw, 16)
                else:
                    value = int(value_raw)
            else:
                value = value_raw
            
            tx = {
                'to': self.w3.to_checksum_address(payload.get('to')),
                'data': payload.get('data'),
                'value': value,
                'chainId': payload.get('chainId', 5000),
                'nonce': nonce,
                'gasPrice': self.w3.eth.gas_price
            }
            
            # Estimate gas
            try:
                estimated_gas = self.w3.eth.estimate_gas(tx)
                tx['gas'] = int(estimated_gas * 1.2) # 20% buffer
            except Exception as e:
                # Fallback gas limit
                tx['gas'] = 2000000

            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            # Wait for receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            result = {
                "status": "success",
                "tx_hash": tx_hash.hex(),
                "agent_identity_id": agent_identity_id,
                "session_id": session_id,
                "decision_hash": decision_hash,
                "gas_used": receipt.gasUsed,
                "block_number": receipt.blockNumber
            }
            
            log_telemetry_event(
                level="INFO",
                component="mantle_execution_agent",
                action="broadcast_tx",
                description="Transaction successfully executed and mined.",
                metadata=result
            )
            return result
        except Exception as e:
            error_result = {
                "status": "failed",
                "error": str(e),
                "agent_identity_id": agent_identity_id,
                "session_id": session_id,
                "decision_hash": decision_hash
            }
            log_telemetry_event(
                level="ERROR",
                component="mantle_execution_agent",
                action="broadcast_tx_failed",
                description="Transaction failed.",
                metadata=error_result
            )
            return error_result
