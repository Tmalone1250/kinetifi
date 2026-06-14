import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any
import ast

# Ensure telemetry directory exists relative to project root
TELEMETRY_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "telemetry"))
EVENT_STREAM_PATH = os.path.join(TELEMETRY_DIR, "event_stream.json")

os.makedirs(TELEMETRY_DIR, exist_ok=True)

logger = logging.getLogger(__name__)

def log_telemetry_event(level: str, component: str, action: str, description: str, metadata: Dict[str, Any]):
    """
    Appends a structured JSON telemetry event to the persistent event stream for the dashboard.
    Also emits standard logging to stdout/stderr.
    
    Args:
        level (str): Log level (e.g., INFO, SUCCESS, ERROR).
        component (str): The subsystem making the log (e.g., intent_parser, cli_wrapper).
        action (str): The specific action taken.
        description (str): Human-readable explanation of the event.
        metadata (Dict[str, Any]): Deep metrics (latency, tx_hashes, token counts).
    """
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level.upper(),
        "component": component,
        "action": action,
        "description": description,
        "metadata": metadata
    }
    
    # Standard Python logging emission
    log_msg = f"[{component}] {action}: {description}"
    if level.upper() == "ERROR":
        logger.error(log_msg)
    elif level.upper() == "WARNING":
        logger.warning(log_msg)
    else:
        logger.info(log_msg)
        
    # JSON Append-only Telemetry persistence
    try:
        with open(EVENT_STREAM_PATH, "a") as f:
            # Explicitly serialize the payload to strictly double-quoted JSON,
            # and fallback to str for non-serializable objects to prevent crashes.
            f.write(json.dumps(event, default=str) + "\n")
    except Exception as e:
        logger.error(f"FATAL: Could not write to telemetry stream {EVENT_STREAM_PATH}: {e}")

class TelemetryLogger:
    """Object-oriented wrapper around log_telemetry_event for dependency injection."""
    def __init__(self, filepath: str = None):
        self.filepath = filepath # Defaults to the global EVENT_STREAM_PATH in log_telemetry_event
        
    def log_info(self, component: str, action: str, description: str, metadata: Dict[str, Any] = None):
        log_telemetry_event("INFO", component, action, description, metadata or {})
        
    def log_warn(self, component: str, action: str, description: str, metadata: Dict[str, Any] = None):
        log_telemetry_event("WARN", component, action, description, metadata or {})
        
    def log_success(self, component: str, action: str, description: str, metadata: Dict[str, Any] = None):
        log_telemetry_event("SUCCESS", component, action, description, metadata or {})
        
    def log_error(self, component: str, action: str, description: str, metadata: Dict[str, Any] = None):
        log_telemetry_event("ERROR", component, action, description, metadata or {})

def extract_lendle_bundle_robust(tool_message_content) -> list:
    """Robustly extracts the bundle array from various ToolMessage formats."""
    try:
        if isinstance(tool_message_content, str):
            # Prefer json.loads as the primary attempt before falling back to ast
            try:
                parsed = json.loads(tool_message_content)
                if isinstance(parsed, dict):
                    return parsed.get("bundle", [])
            except (ValueError, SyntaxError):
                pass
                
            try:
                parsed = ast.literal_eval(tool_message_content)
                if isinstance(parsed, dict):
                    return parsed.get("bundle", [])
            except (ValueError, SyntaxError):
                pass
                
            return []
        
        if isinstance(tool_message_content, dict):
            return tool_message_content.get("bundle", [])
            
        if isinstance(tool_message_content, list):
            return tool_message_content
            
    except Exception:
        pass
    return []
