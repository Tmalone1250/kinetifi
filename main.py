import asyncio
import logging
import sys

from core.intent.parser import parse_intent
from skills.peg_arbitrage import PegArbitrageSkill

# Configure standard console output for the developer running the daemon
logging.basicConfig(level=logging.INFO, stream=sys.stdout, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

async def run_kinetifi_daemon():
    logger.info("Initializing KinetiFi Agentic Wallet OS...")
    
    # In a production environment, this would be an infinite loop reading from an RPC queue or WebSocket.
    # For the Turing Test Hackathon simulation, we process a hardcoded "depeg" intent to demonstrate the end-to-end flow.
    user_prompt = "The USDY token has depegged. Swap 250 USDC for USDY."
    logger.info(f"Received user intent: '{user_prompt}'")
    
    try:
        # Phase 1: Intent Parsing (LLM or High-Speed Fallback)
        logger.info("Routing intent to Parser Engine...")
        parsed_intent = await parse_intent(user_prompt)
        
        # Phase 2: Skill Execution & Guardrails
        logger.info("Routing parsed plan to PegArbitrageSkill...")
        skill = PegArbitrageSkill()
        result = await skill.execute(parsed_intent)
        
        # Phase 3: Final Readout
        logger.info("=========================================")
        logger.info("End-to-End Execution Complete.")
        logger.info(f"Return Code: {result.returncode}")
        logger.info(f"Latency: {result.latency_ms:.2f}ms")
        logger.info(f"TX Hash: {result.tx_hash}")
        logger.info("=========================================")
        
    except Exception as e:
        logger.error(f"Critical execution failure during orchestrator loop: {e}")

if __name__ == "__main__":
    asyncio.run(run_kinetifi_daemon())
