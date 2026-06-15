# **KinetiFi: Autonomous Intent-Based Wallet OS & Arbitrage Engine**

### ***A Premium Agentic Wallet Operating System, On-Chain Keeper Strategy, and High-Fidelity Observability Pipeline on Mantle L2***

---

## **1. Executive Summary**

Traditional Web3 interactions are highly fragmented, requiring manual, transaction-by-transaction configurations that are prone to high slippage, gas inefficiencies, and human error. Static automation scripts exist, but they lack cognitive reasoning, dynamic parameter adjustment, and safety guardrails.

**KinetiFi** solves this by introducing a **Headless Agentic Wallet OS**. Operating via a novel **Hierarchical Multi-Agent Framework (Hub-and-Spoke)**, the system constantly monitors live DEXs and Lending protocols, evaluates systemic risks, and executes complex defensive and offensive strategies autonomously across both the **Casper Network** and **Mantle L2**. By heavily restricting tool context (under 7 tools per agent), it ensures sub-second local LLM inference with zero hallucinations.

### **Core Design Pillars for the Turing Test Hackathon 2026:**
* **Hierarchical Multi-Agent Orchestration**: A global `Supervisor` routes intents to specialized `Casper` or `Mantle` Chain Routers, which in turn delegate tasks to isolated, highly-specialized domain sub-agents (Yield, Staking, Identity, NFT, Execution).
* **Zero-Trust Safety Model**: The AI agent operates in a dual-lane execution framework, preparing unsigned atomic transaction bundles for the user. Under no circumstances does the agent hold private keys. All transactions require explicit cryptographic co-signing via wallet prompts (e.g., MetaMask, AppKit).
* **Advanced Skills Command Center**: A three-panel control dashboard (Arbitrage, Rebalance, Auto-Compound) with an integrated **Global Policy Rail** (gas limit, max slippage, stop loss) and a live, streaming **Execution Terminal** powered by Server-Sent Events (SSE).
* **Emergency Stop Guardrail**: A real-time, high-priority fallback system. Pressing the "Stop" button in the dashboard or typing "stop" in the AI chat triggers an immediate backend halt, clearing out execution queues and logging a critical alert to ensure absolute user control.
* **Force-Trigger Sandbox (Demo Mode)**: Enables judges and developers to bypass waiting for slow market drifts or rare arbitrage opportunities. Clicking "Force Trigger" on any skill card instantly simulates real-time market shocks (like a Whale Dump or Flash Crash) to demonstrate how the agent scans, reasons, generates, and prompts for bundle signatures.
* **Radical Transparency (SSE Telemetry)**: The agent hierarchy records every decision step, LLM token metric, and handoff into a unified JSON telemetry stream, which is piped via Server-Sent Events (SSE) into the Next.js dashboard.
* **Dual-Chain Integration**: Seamlessly executes cross-chain operations and queries on the Casper Network via `casper-mcp-py` and Mantle L2 via `mantle-mcp` and a `web3[async]` provider.

---

## **2. System Topology**

The KinetiFi system is designed as a decoupled, asynchronous pipeline running inside a secure environment:

```text
  ┌───────────────┐        1. Global User Intent               ┌───────────────────┐
  │  Owner EOA    ├───────────────────────────────────────────►│  Supervisor Agent │
  │  (MetaMask/   │◄──────────────────────────────────────────┤  (Global Router)  │
  │  Casper Dash) │        4. Co-sign Actions /                └────┬─────────┬────┘
  └───────────────┘        Automated Execution                      │         │
                                                          ┌─────────▼─┐     ┌─▼─────────┐
                                              2. Route to │  Casper   │     │  Mantle   │
                                                 Chains   │  Router   │     │  Router   │
                                                          └────┬──────┘     └─────┬─────┘
  ┌───────────────┐                                            │                  │
  │  Casper &     │◄──────── [ 3. Handoff to Domains ] ────────┼──────────────────┘
  │  Mantle L2    │◄──────── (Yield, Staking, DEX, etc.) ──────▼
  └───────┬───────┘                                     ┌───────────────────┐
          │                                             │ Domain Sub-Agents │
          │ (On-Chain Settlement)                       └────────┬──────────┘
          └──────────────────────────────────────────────────────┤
                                                                 ▼ (Captures Output)
  ┌───────────────┐        5. Renders Event Feeds via SSE ┌───────────────────┐
  │  Next.js      │◄──────────────────────────────────────┤  Telemetry Engine │
  │  Dashboard    │                                       │  (Decision Logs)  │
  └───────────────┘                                       └───────────────────┘
```

---

## **3. The KinetiFi Subsystems**

### **3.1 Hierarchical Multi-Agent Engine (`core/agents/`)**
The brain of KinetiFi. It breaks down monolithic prompts into microscopic contexts:
- **Supervisor (`supervisor.py`)**: Routes global intents to specific chains without loading execution tools.
- **Chain Routers (`casper_agent.py`, `mantle_agent.py`)**: Delegates tasks to domain sub-agents.
- **Specialized Sub-Agents (`sub_agents/`)**: Micro-agents with < 7 tools each (e.g., Yield, Staking, Identity) to guarantee sub-second local LLM inference.

### **3.2 Live On-Chain Client (`core/execution/onchain_client.py`)**
Establishes a high-fidelity cryptographic connection layer to the networks.
- **Real-Time State Queries**: Interacts with the live Mantle RPC gateway using `web3[async]` and Casper via `casper-mcp-py`.
- **Uniswap V3 Pool Oracles**: Queries the active `slot0` state of Agni and Merchant Moe pools on Mantle L2, parsing `sqrtPriceX96` to compute live conversion ratios dynamically.

### **3.3 Multi-DEX Scanner (`core/execution/dex_scanner.py`)**
A highly concurrent polling daemon that extracts and compares prices across major DEXs for Volatile Blue-Chips (WMETH, FBTC) to identify arbitrage opportunities.

### **3.4 LTV Monitor (`core/execution/ltv_monitor.py`)**
Evaluates lending positions in real-time, classifying health statuses (`HEALTHY`, `CRITICAL`, `REBALANCING`) based on protocol liquidation thresholds.

### **3.5 Pluggable Skills Engine (`skills/`)**
Extends capabilities via an Abstract Base Class (`BaseSkill`) to construct automated strategies:
- **`arbitrage.py` (`VolatileArbitrageSkill`)**: Executes flash-loan-enabled arbitrage strikes, enforcing Net Arbitrage Profitability (NAP) invariants.
- **`flywheel_manager.py` (`FlywheelManagerSkill`)**: Issues Smart Contract `RESCUE` or `COMPOUND` payloads based on real-time LTV monitor signals.
- **`swap.py` & `liquidity.py`**: Standard primitive interactions for generic routing.

### **3.6 High-Fidelity Logging & SSE Telemetry (`core/observability/decision_log.py`)**
Records every internal event, state transition, and subprocess response into standard output while concurrently appending flat JSON-Lines strings to `telemetry/event_stream.json`.

### **3.7 Advanced Skills Command Center (Frontend & Backend)**
Provides a beautiful, three-panel UI control system:
1. **Arbitrage Panel**: Renders real-time scanned spreads between Agni and Merchant Moe. Users can toggle execution parameters and force simulations.
2. **Rebalance Panel**: Allows users to specify target weights for stablecoin and volatile assets (e.g., WMNT/USDT) and triggers automated re-allocation.
3. **Auto-Compound Panel**: Automates harvesting yield from Merchant Moe and Lendle pools, wrapping/zapping it back into the LP pools.
4. **Global Risk Rail**: Configure gas ceilings, slippage tolerances, and max loss thresholds.
5. **Live Log Terminal**: Streams simulated and live execution steps via SSE directly to the UI.

### **3.8 Emergency Stop Guardrail**
Safety first. A single click of the "Emergency Stop" button or typing "stop" in the AI chat instantly sets a global execution lock in `server.py`, terminating all active sub-processes, canceling transaction proposals, and halting agent execution.

---

## **4. Technical File-System Blueprint**

```text
kinetifi/
├── server.py               # FastAPI Command Center daemon
├── requirements.txt        # Backend dependencies
├── dashboard/              # Legacy Next.js dashboard
├── frontend/               # Modern Next.js 14 App Router Command Center
│   ├── app/                # UI Pages & Components
│   │   ├── dashboard/      # Advanced Skills & Agent Control
│   │   │   ├── agent/      # AI Chat Interface & Emergency Stop
│   │   │   └── skills/     # 3-Panel Control & Telemetry Logs
│   │   └── page.tsx        # Command Center Landing Page
├── contracts/              # MockMantleDeFi.sol Sandbox Smart Contracts
├── core/
│   ├── agents/             # Hierarchical Agent System
│   │   ├── supervisor.py   # Global Orchestrator
│   │   ├── casper_agent.py # Casper Chain Router
│   │   ├── mantle_agent.py # Mantle Chain Router
│   │   └── sub_agents/     # Hyper-Specialized Domain Agents
│   ├── execution/          # Non-blocking blockchain bindings
│   │   ├── cli_wrapper.py  # Asynchronous subprocess executor
│   │   ├── dex_scanner.py  # Agni vs Merchant Moe polling daemon
│   │   ├── ltv_monitor.py  # Lending protocol health classification
│   │   └── onchain_client.py # Live Web3 async provider and pool price queries
│   └── observability/      # Observable tracking and telemetry logging
│       └── decision_log.py # Structured JSON-Lines telemetry stream writer
├── telemetry/              # Live local event stream output (ignored in git)
│   └── event_stream.json   # Flat JSON stream database for the frontend
├── skills/                 # Pluggable modular capabilities
│   ├── base.py             # Abstract Base Class for skills
│   ├── arbitrage.py        # Volatile Arbitrage strategy
│   └── flywheel_manager.py # Flash Crash Rescue strategy
└── sandbox/                # Sandbox, test suites, queries, and logs (ignored in git)
    ├── tests/              # Deterministic Sandbox Simulations
    │   ├── run_stochastic_simulation.py  # Injects a Whale Dump for Arbitrage
    │   └── run_flywheel_simulation.py    # Injects a Flash Crash for Flywheel
    ├── queries/            # Entrypoint and ABI query scripts (e.g., query_abi.py)
    └── logs/               # Local node/simulation log outputs (e.g., anvil.log)
```

---

## **5. Environment Setup & Execution Playbook**

### **5.1 Setup the Virtual Environment**
Verify that the virtual environment symlinks are configured correctly for Python 3.10+ on Linux:
```bash
rm -f .venv/bin/python3 .venv/bin/python
ln -s /usr/bin/python3 .venv/bin/python3
ln -s python3 .venv/bin/python
.venv/bin/pip install -r requirements.txt
```

### **5.2 Start the Command Center Backend**
The KinetiFi backend operates as a FastAPI daemon. Start it with uvicorn:
```bash
.venv/bin/python -m uvicorn server:app --reload --port 8000
```

### **5.3 Launch the Dashboard Frontend**
Navigate to the frontend directory and start the Next.js development server:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### **5.4 Execute the Local Sandbox Simulations**
KinetiFi is built with a highly deterministic local testing environment running on Anvil (`anvil --port 8545`). These scripts inject live market shocks into the blockchain to test the agent's defensive responses.

**Scenario A: The Stochastic Whale Dump (Arbitrage)**
```bash
PYTHONPATH=. .venv/bin/python sandbox/tests/run_stochastic_simulation.py
```

**Scenario B: The Flash Crash (Treasury Flywheel Rescue)**
```bash
PYTHONPATH=. .venv/bin/python sandbox/tests/run_flywheel_simulation.py
```

### **5.5 Integrating the KinetiFi MCP Server (`kinetifi-mcp`)**

KinetiFi extends its autonomous logic capabilities through a standalone Model Context Protocol (MCP) server. This server exposes custom DeFi strategy execution tools, identity management protocols, and specialized routing logic to AI agents.
* **KinetiFi MCP Repository:** [https://github.com/tmalone1250/kinetifi-mcp](https://github.com/tmalone1250/kinetifi-mcp)

#### **How it is Integrated:**
- Operates via a **zero-trust, stdio transport** connection using the official MCP Python SDK.
- Can be invoked by external AI clients (like Claude Desktop or the Antigravity agent) to interact directly with the KinetiFi smart contract ecosystem.

### **5.6 Integrating the Mantle MCP Server (`mantle-mcp`)**

KinetiFi integrates with the **Mantle Network** using a modular, specialized Model Context Protocol (MCP) server. The server codebase is hosted in a separate repository:
* **Mantle MCP Repository:** [https://github.com/Tmalone1250/mantle-mcp/](https://github.com/Tmalone1250/mantle-mcp/)

#### **How it is Integrated:**
- The KinetiFi agent loop uses a **zero-trust, subprocess-spawning stdio transport**.
- When the `MantleYieldAgent` or `MantleIdentityAgent` is invoked, it dynamically locates the server at `KinetiFi/mantle-mcp/server.py`.
- It automatically checks for a local virtual environment (`.venv/bin/python`) in the `mantle-mcp` directory to execute the server, falling back to the parent virtual environment if needed.
- This ensures plug-and-play integration without requiring you to run a separate terminal command or service.

#### **Manual Setup (If Running Standalone):**
If you wish to test or run the `mantle-mcp` server standalone:
1. Navigate to the `mantle-mcp/` directory:
   ```bash
   cd mantle-mcp
   ```
2. Set up the environment and run via FastMCP:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   fastmcp dev server.py
   ```

### **5.7 Running the Demo Mode (Force Trigger)**
1. Ensure both the backend (port 8000) and frontend (port 3000) are running.
2. Navigate to the **Advanced Skills** page in the dashboard.
3. Observe the three panels: **Arbitrage**, **Active Rebalancing**, and **Yield Auto-Compounding**.
4. Click the **Force Trigger** button on any card to simulate an event.
5. Watch the live SSE telemetry log panel immediately populate with detailed analysis steps showing how the agent scans, maps routes, calculates margins, structures transaction bundles, and requests user approval.

---

*Abstracting the entire complexity of Web3 into an autonomous, institutional-grade OS built natively for the Mantle ecosystem.*

