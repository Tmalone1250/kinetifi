from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from core.execution.dex_scanner import MultiDexScanner
from core.execution.onchain_client import OnChainClient
from core.observability.decision_log import TelemetryLogger
from core.execution.ltv_monitor import LTVMonitor
from skills.flywheel_manager import FlywheelManagerSkill
import asyncio

app = FastAPI(title="KinetiFi Daemon API")

# Allow Next.js dashboard to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
class MockCLIWrapper:
    async def execute_action(self, action, payload):
        await asyncio.sleep(2) # Simulate network delay
        return {"status": "success", "tx_hash": "0xabc123"}

logger = TelemetryLogger()
onchain = OnChainClient(rpc_url="https://rpc.mantle.xyz")
scanner = MultiDexScanner(onchain_client=onchain, logger=logger)
ltv_monitor = LTVMonitor(logger=logger)
mock_cli = MockCLIWrapper()
flywheel_skill = FlywheelManagerSkill(cli_wrapper=mock_cli, logger=logger, onchain_client=onchain)

is_flywheel_running = False

async def flywheel_loop():
    global is_flywheel_running
    while is_flywheel_running:
        try:
            if hasattr(onchain, "mock_defi_contract"):
                position = await onchain.get_lending_position("0x1234567890123456789012345678901234567890")
            else:
                position = {
                    "supplied_fbtc": 1 * 10**18,
                    "borrowed_usdc": 20000,
                    "fbtc_price_usd": 65000,
                    "unharvested_rewards_usdc": 0
                }
            
            signal = ltv_monitor.evaluate_position(position)
            
            if signal.action_required in ["RESCUE", "COMPOUND"]:
                await flywheel_skill.execute(signal)
                
        except Exception as e:
            logger.log_error("flywheel_loop", "error", str(e))
        
        await asyncio.sleep(5)

async def dummy_callback(event):
    pass

@app.post("/api/scanner/start")
async def start_scanner(background_tasks: BackgroundTasks):
    """Activated by the Next.js Dashboard Toggle"""
    if not scanner._is_running:
        # Load targets (Agni vs Moe for WMETH)
        scanner.add_target(
            symbol="WMETH",
            agni_pool="0xAgniFactoryResolved...", 
            moe_pool="0xMoeFactoryResolved...",
            threshold=0.005 # 0.5% threshold
        )
        
        # Fire the async scanner loop in the background
        # (In production, wire the callback to the VolatileArbitrageSkill)
        background_tasks.add_task(scanner.start_scanner, dummy_callback)
        return {"status": "Scanner Activated", "targets": ["WMETH", "FBTC"]}
    return {"status": "Scanner Already Running"}

@app.post("/api/scanner/stop")
async def stop_scanner():
    """Deactivated by the Next.js Dashboard Toggle"""
    if scanner._is_running:
        scanner.stop_scanner()
        return {"status": "Scanner Deactivated"}
    return {"status": "Scanner Not Running"}

@app.post("/api/flywheel/start")
async def start_flywheel_monitor(background_tasks: BackgroundTasks):
    """Manually start the LTV monitoring background loop."""
    global is_flywheel_running
    if not is_flywheel_running:
        is_flywheel_running = True
        background_tasks.add_task(flywheel_loop)
        return {"status": "Flywheel Monitor Active"}
    return {"status": "Flywheel Monitor Already Active"}

@app.post("/api/flywheel/stop")
async def stop_flywheel_monitor():
    """Manually stop the LTV monitoring background loop."""
    global is_flywheel_running
    if is_flywheel_running:
        is_flywheel_running = False
        return {"status": "Flywheel Monitor Inactive"}
    return {"status": "Flywheel Monitor Not Running"}

