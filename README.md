# **KinetiFi: Autonomous Intent-Based Wallet OS & Arbitrage Engine**

### ***A Premium Agentic Wallet Operating System, On-Chain Keeper Strategy, and High-Fidelity Observability Pipeline on Mantle L2***

---

## **1. Executive Summary**

Traditional Web3 interactions are highly fragmented, requiring manual, transaction-by-transaction configurations that are prone to high slippage, gas inefficiencies, and human error. Static automation scripts exist, but they lack cognitive reasoning, dynamic parameter adjustment, and safety guardrails.

**KinetiFi** solves this by introducing a **Headless Agentic Wallet OS**. Operating via a novel **Hierarchical Multi-Agent Framework (Hub-and-Spoke)**, the system constantly monitors live DEXs and Lending protocols, evaluates systemic risks, and executes complex defensive and offensive strategies autonomously across both the **Casper Network** and **Mantle L2**. By heavily restricting tool context (under 7 tools per agent), it ensures sub-second local LLM inference with zero hallucinations.

### **Core Design Pillars for the Turing Test Hackathon 2026:**
* **Hierarchical Multi-Agent Orchestration**: A global `Supervisor` routes intents to specialized `Casper` or `Mantle` Chain Routers, which in turn delegate tasks to isolated, highly-specialized domain sub-agents (Yield, Staking, Identity, NFT, Execution).
* **Radical Transparency (SSE Telemetry)**: The agent hierarchy records every decision step, LLM token metric, and handoff into a unified JSON telemetry stream, which is piped via Server-Sent Events (SSE) into a Next.js command center.
* **Autonomous Volatile Arbitrage & Treasury Defense**: Scans DEXs for price divergences to execute atomic strikes, and autonomously monitors lending LTVs to formulate Smart Contract rescue payloads during flash crashes.
* **Dual-Chain Integration**: Seamlessly executes cross-chain operations and queries on the Casper Network via `casper-mcp-py` and Mantle L2 via the `byreal-cli` and `web3[async]` provider.

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

### **3.3 LTV Monitor (`core/execution/ltv_monitor.py`)**
Evaluates lending positions in real-time, classifying health statuses (`HEALTHY`, `CRITICAL`, `REBALANCING`) based on protocol liquidation thresholds.

### **3.4 Execution Subprocess Wrapper (`core/execution/cli_wrapper.py`)**
All transaction instructions are dispatched through a secure asynchronous command executor.
- **Non-Blocking IO**: Utilizes `asyncio.create_subprocess_exec` to interact with the host system without blocking the python daemon.
- **EVM Hash Extraction**: Uses a standard 64-character EVM hexadecimal regex (`0x[a-fA-F0-9]{64}`) to parse transaction hashes out of stdout streams.

### **3.5 Pluggable Skills Engine (`skills/`)**
Extends capabilities via an Abstract Base Class (`BaseSkill`) to construct automated strategies:
- **`arbitrage.py` (`VolatileArbitrageSkill`)**: Executes flash-loan-enabled arbitrage strikes, enforcing Net Arbitrage Profitability (NAP) invariants.
- **`flywheel_manager.py` (`FlywheelManagerSkill`)**: Issues Smart Contract `RESCUE` or `COMPOUND` payloads based on real-time LTV monitor signals.
- **`swap.py` & `liquidity.py`**: Standard primitive interactions for generic routing.

### **3.6 High-Fidelity Logging (`core/observability/decision_log.py`)**
Records every internal event, state transition, and subprocess response into standard output while concurrently appending flat JSON-Lines strings to `telemetry/event_stream.json`.

---

## **4. Technical File-System Blueprint**

```text
kinetifi/
├── server.py               # FastAPI Command Center daemon
├── dashboard/              # Next.js 14 App Router UI (React, Tailwind, Wagmi)
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
└── tests/                  # Deterministic Sandbox Simulations
    ├── run_stochastic_simulation.py  # Injects a Whale Dump for Arbitrage
    └── run_flywheel_simulation.py    # Injects a Flash Crash for Flywheel
```

---

## **5. Environment Setup & Execution Playbook**

### **5.1 Setup the Virtual Environment**
Verify that the virtual environment symlinks are configured correctly for Python 3.14 on Linux:
```bash
rm -f .venv/bin/python3 .venv/bin/python
ln -s /usr/bin/python3 .venv/bin/python3
ln -s python3 .venv/bin/python
.venv/bin/pip install -r requirements.txt
```

### **5.2 Start the Command Center**
The KinetiFi backend operates as a FastAPI daemon. Start it with uvicorn:
```bash
.venv/bin/python -m uvicorn server:app --reload --port 8000
```

### **5.3 Launch the Dashboard**
The Next.js dashboard consumes the backend telemetry stream via SSE.
```bash
cd dashboard
npm install
npm run dev
```

### **5.4 Execute the Local Sandbox Simulations**
KinetiFi is built with a highly deterministic local testing environment running on Anvil (`anvil --port 8545`). These scripts inject live market shocks into the blockchain to test the agent's defensive responses.

**Scenario A: The Stochastic Whale Dump (Arbitrage)**
```bash
.venv/bin/python tests/run_stochastic_simulation.py
```

**Scenario B: The Flash Crash (Treasury Flywheel Rescue)**
```bash
.venv/bin/python tests/run_flywheel_simulation.py
```

---

*Abstracting the entire complexity of Web3 into an autonomous, institutional-grade OS built natively for the Mantle ecosystem.*
