import json
import subprocess
from typing import Dict, Any, List

def _run(argv: List[str], timeout: int = 30) -> Dict[str, Any]:
    """
    Secure subprocess execution wrapper.
    Must use shell=False, strict argv lists, and capture stdout/stderr separately.
    """
    try:
        result = subprocess.run(
            argv,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False
        )
        
        # Try to parse stdout as JSON
        output_data = {}
        if result.stdout:
            try:
                output_data = json.loads(result.stdout)
            except json.JSONDecodeError:
                output_data = {"raw_output": result.stdout}
                
        if result.returncode != 0:
            return {
                "status": "failed",
                "error": result.stderr.strip() if result.stderr else "Non-zero exit code but no stderr.",
                "output": output_data,
                "returncode": result.returncode
            }
            
        return {
            "status": "success",
            "data": output_data
        }
        
    except subprocess.TimeoutExpired:
        return {
            "status": "failed",
            "error": f"Execution timed out after {timeout} seconds."
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }

def byreal_swap_skill(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes a Byreal CLI swap headlessly.
    Validates inputs strictly and wraps results in a deterministic envelope.
    """
    required_keys = ["wallet_id", "input_mint", "output_mint", "amount", "slippage_bps", "identity_id", "decision_hash"]
    
    # Validation
    for key in required_keys:
        if key not in payload:
            return {
                "status": "failed",
                "error": f"Missing required key: {key}",
                "identity_id": payload.get("identity_id", "unknown"),
                "decision_hash": payload.get("decision_hash", "unknown")
            }
            
    # Hardcoded CLI executable path (maps to our environment)
    cli_executable = "byreal-cli"
    
    # Construct argv securely
    argv = [
        cli_executable,
        "swap",
        "--wallet", str(payload["wallet_id"]),
        "--in", str(payload["input_mint"]),
        "--out", str(payload["output_mint"]),
        "--amount", str(payload["amount"]),
        "--slippage", str(payload["slippage_bps"]),
        "--json",
        "--no-interactive",
        "--yes"
    ]
    
    # Execute securely
    raw_result = _run(argv, timeout=30)
    
    # Wrap in deterministic envelope for telemetry/observability
    envelope = {
        "identity_id": payload["identity_id"],
        "decision_hash": payload["decision_hash"],
        "execution_result": raw_result
    }
    
    if raw_result["status"] == "failed":
        envelope["status"] = "failed"
    else:
        envelope["status"] = "success"
        
    return envelope

def byreal_lp_skill(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes a Byreal CLI LP action headlessly.
    Validates inputs strictly, handles optional flags dynamically, and wraps results deterministically.
    """
    required_keys = ["wallet_id", "pool_id", "action", "identity_id", "decision_hash"]
    
    # Validation
    for key in required_keys:
        if key not in payload:
            return {
                "status": "failed",
                "error": f"Missing required key: {key}",
                "identity_id": payload.get("identity_id", "unknown"),
                "decision_hash": payload.get("decision_hash", "unknown")
            }
            
    # Hardcoded CLI executable path (maps to our environment)
    cli_executable = "byreal-cli"
    
    # Construct base argv securely
    argv = [
        cli_executable,
        "lp",
        "--wallet", str(payload["wallet_id"]),
        "--pool-id", str(payload["pool_id"]),
        "--action", str(payload["action"]),
        "--json",
        "--no-interactive",
        "--yes"
    ]
    
    # Optional flags mapping
    optional_keys = ["lower_price", "upper_price", "amount_token_a", "amount_token_b", "position_id", "slippage_bps"]
    for key in optional_keys:
        if key in payload and payload[key] is not None:
            flag = f"--{key.replace('_', '-')}"
            argv.append(flag)
            argv.append(str(payload[key]))
            
    # Execution
    timeout_s = int(payload.get("timeout_s", 45))
    raw_result = _run(argv, timeout=timeout_s)
    
    # Wrap in deterministic envelope for telemetry/observability
    envelope = {
        "identity_id": payload["identity_id"],
        "decision_hash": payload["decision_hash"],
        "skill": "byreal_lp",
        "execution_result": raw_result
    }
    
    if raw_result["status"] == "failed":
        envelope["status"] = "failed"
    else:
        envelope["status"] = "success"
        
    return envelope

if __name__ == "__main__":
    print("Testing Byreal Swap Skill with Dummy Payload...")
    swap_payload = {
        "wallet_id": "burn123",
        "input_mint": "So11111111111111111111111111111111111111112", # SOL
        "output_mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", # USDC
        "amount": "0.1",
        "slippage_bps": "50",
        "identity_id": 1,
        "decision_hash": "0xabc123"
    }
    res_swap = byreal_swap_skill(swap_payload)
    print(json.dumps(res_swap, indent=2))

    print("\nTesting Byreal LP Skill with Dummy Payload (quote action)...")
    lp_payload = {
        "wallet_id": "burn123",
        "pool_id": "RAY_USDC_POOL",
        "action": "quote",
        "amount_token_a": "1.5",
        "slippage_bps": "30",
        "identity_id": 1,
        "decision_hash": "0xdef456"
    }
    res_lp = byreal_lp_skill(lp_payload)
    print(json.dumps(res_lp, indent=2))
