from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from core.execution.dex_scanner import MultiDexScanner
from core.execution.onchain_client import OnChainClient
from core.observability.decision_log import TelemetryLogger

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
logger = TelemetryLogger()
onchain = OnChainClient(rpc_url="https://rpc.mantle.xyz")
scanner = MultiDexScanner(onchain_client=onchain, logger=logger)

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
