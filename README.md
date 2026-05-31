# **KinetiFi: Autonomous Intent-Based Wallet OS & Peg Stability Arbitrage Engine**

### ***A Premium Agentic Wallet Operating System, On-Chain Keeper Strategy, and High-Fidelity Observability Pipeline on Mantle L2***

---

## **1. Executive Summary**

Traditional Web3 interactions are highly fragmented, requiring manual, transaction-by-transaction configurations that are prone to high slippage, gas inefficiencies, and human error. Static automation scripts exist, but they lack cognitive reasoning, dynamic parameter adjustment, and safety guardrails.

**KinetiFi** solves this by introducing a **Headless Agentic Wallet OS**. The system ingests natural language user instructions, compiles them into a validated, step-by-step transaction execution plan, performs live pre-flight guardrail checks, and executes transactions on the Mantle L2 network using the native `byreal-cli`.

### **Core Design Pillars for the Turing Test Hackathon 2026:**
* **Radical Transparency**: The agent records every decision step, LLM token metric, and subprocess shell response to a unified JSON telemetry stream to satisfy Turing Test validation benchmarks.
* **Deterministic Fallbacks**: When local LLM inference fails, the system automatically falls back to regex string-matching to prevent application freezes.
* **Utility-Driven Trading**: Implements a Peg Stability Arbitrage (PSA) module to actively protect capital and capture risk-free spreads rather than relying on speculative momentum indicators.
* **Dual-Engine On-Chain Integration**: Seamlessly maps transactions through the `byreal-cli` while directly querying active blockchain states (balances, AMM Uniswap V3 slot0 pool feeds) using an asynchronous `web3[async]` provider.

---

## **2. System Topology**

The KinetiFi system is designed as a decoupled, asynchronous pipeline running inside a secure Ubuntu environment:

```text
  ┌───────────────┐        1. EIP-191 Signature        ┌───────────────────┐
  │  Owner EOA    ├───────────────────────────────────►│  KinetiFi Agent   │
  │  (MetaMask)   │◄──────────────────────────────────┤  Orchestration    │
  └───────────────┘        4. Co-sign Actions /        │  Engine (Backend) │
                           Automated Execution         └─────────┬─────────┘
                                                                 │
  ┌───────────────┐                                              │ 2. Deploy
  │  Mantle L2    │◄─────────────────────────────────────────────┤    Smart Account
  │  Blockchain   │◄────────── [ 3. Mint ERC-8004 Identity ] ────┤    (ERC-4337 Proxy)
  └───────┬───────┘                                              │
          │                                                      ▼
          │ (On-Chain Settlement)                     ┌───────────────────┐
          └──────────────────────────────────────────►│  byreal-cli Shell │
                                                      └──────────┬────────┘
                                                                 │
                                                                 ▼ (Captures stdout)
                                                      ┌───────────────────┐
  ┌───────────────┐        5. Renders Event Feeds     │  Telemetry Engine │
  │  Frontend     │◄──────────────────────────────────┤  Writes to Local  │
  │  Dashboard    │                                   │  JSON File Store  │
  └───────────────┘                                   └───────────────────┘
```

---

## **3. Subsystem Specifications**

### **3.1 Intent Parser Layer (`core/intent/`)**
The parser translates natural language instructions into a structured, typed execution array of individual actions.
- **Pydantic Schemas**: Enforces absolute structural conformity using `ParsedIntent` and `StepExecution` typed models.
- **Target Model**: Queries a local Ollama instance running the `qwen2.5:7b` model over `httpx`.
- **Regex Fallback Protocol**: If the local Ollama instance is offline or returns an invalid JSON string, a regex-driven parser handles standard swaps dynamically to prevent application freezes.

### **3.2 Execution Subprocess Wrapper (`core/execution/cli_wrapper.py`)**
All transaction instructions are dispatched through a secure asynchronous command executor.
- **Non-Blocking IO**: Utilizes `asyncio.create_subprocess_exec` to interact with the host system without blocking the python daemon.
- **Token Whitelist Guard**: A strict pre-flight check scans CLI arguments for token flags (`--from`, `--to`, `--token`) and throws a `WhitelistError` if the asset is not in the immutable set: `MNT`, `WMETH`, `USDC`, `USDY`.
- **EVM Hash Extraction**: Uses a standard 64-character EVM hexadecimal regex (`0x[a-fA-F0-9]{64}`) to parse transaction hashes out of stdout streams.

### **3.3 Live On-Chain Client (`core/execution/onchain_client.py`)**
Establishes a high-fidelity cryptographic connection layer to the Mantle Network.
- **Real-Time State Queries**: Interacts with the live Mantle RPC gateway (via custom env key `MANTLE_RPC_URL`) using `web3[async]`.
- **ERC-20 Balance Syncing**: Directly calls `balanceOf` and `decimals` functions on contract ABIs for whitelisted tokens.
- **Uniswap V3 Pool Oracles**: Queries the active `slot0` state of the `USDY/USDC` pool on Mantle L2, parsing `sqrtPriceX96` to compute live conversion ratios dynamically.

### **3.4 Pluggable Skills Engine (`skills/`)**
Extends capabilities via an Abstract Base Class (`BaseSkill`) to construct automated strategies:
- **`swap.py` (`SwapSkill`)**: Orchestrates basic token-to-token transactions on Mantle using the `byreal-cli` swap router interface.
- **`liquidity.py` (`LiquiditySkill`)**: Manages active Uniswap V3 concentrated liquidity positions, validating tick boundaries (`lower_tick`, `upper_tick`) prior to dispatching command arguments.
- **`peg_arbitrage.py` (`PegArbitrageSkill`)**: An autonomous keeper strategy that monitors pegged stable assets (e.g., USDY) against base assets (USDC). It evaluates price deviations against a trigger threshold ($\theta = 0.005$) and enforces a **Net Arbitrage Profitability (NAP)** hardening constraint:
  $$\text{NAP} = (\text{Principal} \times |\text{Deviation}|) - \text{GasCost} > \text{TargetProfit}$$
  If the live on-chain MNT gas balance is below `0.1 MNT` or the calculated NAP is below `1.00 USDC`, the pre-flight check blocks the trade.

### **3.5 High-Fidelity Logging (`core/observability/decision_log.py`)**
Records every internal event, state transition, and subprocess response into standard output while concurrently appending flat JSON strings to `telemetry/event_stream.json`.

---

## **4. Technical File-System Blueprint**

```text
kinetifi/
├── .ai_rules               # Global IDE constraints, workflows, and halt guidelines
├── .env                    # Protected Mantle RPC credentials and private keys (not committed)
├── .gitignore              # Absolute isolation of .env, /docs, and /telemetry directories
├── requirements.txt        # Monitored dependencies optimized for the python virtual environment
├── main.py                 # Core orchestration daemon loop
├── core/
│   ├── __init__.py
│   ├── intent/             # Cognitive parsing engine
│   │   ├── __init__.py
│   │   ├── models.py       # Pydantic schemas (StepExecution, ParsedIntent)
│   │   └── parser.py       # Ollama client and Regex fallback handler
│   ├── execution/          # Non-blocking blockchain bindings
│   │   ├── __init__.py
│   │   ├── cli_wrapper.py  # Asynchronous subprocess executor and whitelists
│   │   └── onchain_client.py # Live Web3 async provider and pool price queries
│   └── observability/      # Observable tracking and telemetry logging
│       ├── __init__.py
│       └── decision_log.py # Structured JSON telemetry event-stream writer
├── telemetry/              # Live local event stream output (ignored in git)
│   └── event_stream.json   # Flat JSON event stream database for the frontend
├── skills/                 # Pluggable modular capabilities
│   ├── __init__.py
│   ├── base.py             # Abstract Base Class for skills (BaseSkill)
│   ├── swap.py             # Strategic Swap skill
│   ├── liquidity.py        # Concentrated Liquidity Management skill
│   └── peg_arbitrage.py    # Flagship Peg Stability Arbitrage skill
└── tests/                  # Deterministic integration testing suite
    ├── test_suite_runner.py # Master simulation test runner
    └── test_*.py           # Local subsystem unit tests
```

---

## **5. Environment Setup & Execution Playbook**

### **5.1 Setup the Virtual Environment**
Verify that the virtual environment symlinks are configured correctly for Python 3.14 on Linux:
```bash
# 1. Clean up broken symlinks if drive mount path changes
rm -f .venv/bin/python3 .venv/bin/python
ln -s /usr/bin/python3 .venv/bin/python3
ln -s python3 .venv/bin/python

# 2. Sync the dependencies
.venv/bin/pip install -r requirements.txt
```

### **5.2 Configure Environment Variables**
Create a secure `.env` file in the project root:
```bash
MANTLE_RPC_URL="https://rpc.mantle.xyz"
```

### **5.3 Run the Master Integration Test Suite**
The test suite executes 5 distinct test cases verifying whitelists, tick bounds, and peg triggers against a mock CLI and live on-chain client:
```bash
.venv/bin/python tests/test_suite_runner.py
```

### **5.4 Execute the Orchestrator Daemon**
To simulate a real-time intent parsing and arbitrage swap execution run:
```bash
.venv/bin/python main.py
```

---

## **6. Radical Telemetry Visualizer (Dashboard)**

A decoupled dashboard interface is located under `/dashboard` (Next.js 14, App Router, Tailwind CSS, Wagmi). It maps the EOA-to-SCA onboarding simulation, displays live slider slippage controls, tracks active balances, and parses `telemetry/event_stream.json` via Server-Sent Events (SSE) to render collapsible, color-coded monospace terminal console cards in real-time.

A premium, interactive HTML mockup is pre-rendered for instant evaluation at `[docs/index.html](file:///home/tmalone1250/ToshibaDrive/Dev/DoraHacks/turing_test_hackathon_2026/Kinetifi/docs/index.html)`.
