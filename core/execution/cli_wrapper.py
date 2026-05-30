import re
import time
import asyncio
import logging
from typing import List, Optional
from pydantic import BaseModel, Field

from core.observability.decision_log import log_telemetry_event

logger = logging.getLogger(__name__)

WHITELISTED_ASSETS = {"WMETH", "MNT", "USDC", "USDY"}
TOKEN_FLAGS = {"--from", "--to", "--token"}

class WhitelistError(Exception):
    """Raised when an operation attempts to interact with a non-whitelisted asset."""
    pass

class ExecutionResult(BaseModel):
    stdout: str
    stderr: str
    returncode: int
    latency_ms: float
    tx_hash: Optional[str] = None

def enforce_whitelist(args: List[str]):
    """
    Scans CLI arguments for token flags and ensures the corresponding tokens are whitelisted.
    Raises WhitelistError if a violation is detected.
    """
    for i, arg in enumerate(args):
        if arg in TOKEN_FLAGS and i + 1 < len(args):
            token = args[i + 1].upper()
            if token not in WHITELISTED_ASSETS:
                raise WhitelistError(f"Security Block: Asset '{token}' is not whitelisted. Allowed: {WHITELISTED_ASSETS}")

def extract_tx_hash(text: str) -> Optional[str]:
    """Extracts a standard EVM 64-character transaction hash from text."""
    match = re.search(r"0x[a-fA-F0-9]{64}", text)
    return match.group(0) if match else None

async def run_byreal_cli(args: List[str]) -> ExecutionResult:
    """
    Asynchronously executes a byreal-cli command after passing security checks.
    
    Args:
        args (List[str]): A list of arguments to pass to the CLI.
        
    Returns:
        ExecutionResult: The structured result containing stdout, stderr, latency, and tx_hash.
    """
    # 1. Pre-flight security check
    enforce_whitelist(args)
    
    cmd = ["byreal-cli"] + args
    command_str = " ".join(cmd)
    
    logger.info(f"Executing CLI command: {command_str}")
    
    start_time = time.time()
    
    # Strictly enforce asynchronous subprocess execution
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    
    stdout_bytes, stderr_bytes = await process.communicate()
    
    latency = (time.time() - start_time) * 1000.0
    
    stdout_str = stdout_bytes.decode('utf-8').strip()
    stderr_str = stderr_bytes.decode('utf-8').strip()
    returncode = process.returncode
    
    logger.debug(f"CLI Return Code: {returncode} (Latency: {latency:.2f}ms)")
    if stderr_str:
        logger.error(f"CLI Stderr: {stderr_str}")
        
    tx_hash = extract_tx_hash(stdout_str)
    
    # Format output model
    execution_result = ExecutionResult(
        stdout=stdout_str,
        stderr=stderr_str,
        returncode=returncode,
        latency_ms=latency,
        tx_hash=tx_hash
    )
    
    log_telemetry_event(
        level="SUCCESS" if returncode == 0 else "ERROR",
        component="cli_wrapper",
        action="run_byreal_cli",
        description="Executed byreal-cli command via subprocess.",
        metadata={
            "command": "byreal-cli " + " ".join(args),
            "latency_ms": latency,
            "tx_hash": tx_hash,
            "returncode": returncode
        }
    )
    
    return execution_result
