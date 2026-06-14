# KinetiFi: Zero-Trust Agentic Wallet OS & Multi-Chain Keeper Engine

## 🔗 Quick Links
- **GitHub Repository:** [https://github.com/tmalone1250/kinetifi](https://github.com/tmalone1250/kinetifi)
- **Casper MCP Server (Python Port):** [https://github.com/tmalone1250/casper-mcp-py](https://github.com/tmalone1250/casper-mcp-py)
- **Mantle MCP Server (Python Port):** [https://github.com/Tmalone1250/mantle-mcp](https://github.com/Tmalone1250/mantle-mcp)
- **Demo Video Link:** [https://youtu.be/kn6f4rTfNdM](https://youtu.be/kn6f4rTfNdM)

---

## ⚡ Executive Summary
KinetiFi is an autonomous, intent-based **Headless Wallet Operating System** and **Multi-Chain Portfolio Manager** designed specifically for the **Mantle L2** and **Casper Network** ecosystems. 

Rather than deploying standard automated trading bots, KinetiFi introduces a novel **Zero-Trust "Dual-Lane" Routing Architecture** that strictly separates cognitive AI reasoning from private key execution. By structuring specialized sub-agent loops under a global Supervisor orchestrator, KinetiFi evaluates natural language intents, monitors DEX pool states, detects cross-chain yield spreads, and compiles atomic transaction bundles. Users co-sign these bundles via standard wallets (MetaMask/AppKit) under a **Global Risk Rail**, supported by a real-time **SSE Telemetry Terminal** and on-chain **ERC-8004 Agent Identities**.

---

## 🛑 The Problem: The AI Security & Capital Bleed Crisis
1. **The Private Key Honey-Pot:** Monolithic AI agents that store raw private keys locally or have direct transaction execution rights are extremely vulnerable to prompt-injection, remote attacks, and wallet-draining exploits.
2. **Context-Bloat Latency:** Loading dozens of web3 query and execution tools into a single LLM context window causes slow inference times (4 to 8+ seconds) and high semantic hallucination rates.
3. **Web3 Fragmentation & Friction:** Executing complex DeFi strategies (such as swapping, wrapping, and supplying assets into LP pools) requires users to manually sign multiple sequential transactions, suffering from slippage, gas spikes, and execution friction.
4. **Capital Bleed:** Static automated scripts lack the cognitive reasoning required to evaluate real-time market shocks, resulting in unprofitable trades that fail to dynamically calculate cross-chain gas fees and slippage guards.

---

## 🛡️ The Solution: Hub-and-Spoke Orchestration & Zero-Trust Actuators
KinetiFi implements a decoupled **Eyes ──► Brain ──► Hands** pipeline:
- **The "Eyes" (FastMCP Sensors):** Decoupled, asynchronous MCP servers (`mantle-mcp` and `kinetifi-mcp`) continuously poll live blockchain RPCs, blockscout explorers, Ondo USDY rate indices, and Casper endpoints without requesting private key permissions.
- **The "Brain" (Hub-and-Spoke Orchestration):** A global `Supervisor` agent routes intents to Casper or Mantle Specialists. These specialists delegate to micro-agents (Yield, Identity, Staking, NFT, Execution) keeping toolsets under 7 per agent to guarantee sub-second local LLM inference with zero hallucinations.
- **The "Hands" (Zero-Trust Co-Signing):** The agents never hold keys; they construct unsigned atomic transaction bundles (e.g., wrap MNT + swap + pool WMNT/USDT in a single click using custom smart contracts like the `MerchantMoeZapper`). All transactions require explicit wallet signing (MetaMask/AppKit) in the UI.
- **Advanced Skills Command Center:** A 3-panel dashboard (Arbitrage, Rebalance, Auto-Compound) allowing users to visually configure **Global Policy Rails** (gas limits, slippage, emergency stop) and monitor live reasoning traces via Server-Sent Events (SSE).
- **Emergency Stop & Demo Sandbox:** An instant backend override that halts all execution loops upon a single click or a chat command ("stop"), and a "Force Trigger" sandbox to simulate whale dumps and price drifts for live presentations.

---

## 🚀 Technical Highlights & Hackathon Benchmarks
- **Atomic EVM Transaction Bundles:** Combines approvals, wraps, swaps, and liquidity provisions into single atomic transactions via specialized smart contracts (e.g., zapping MNT into Merchant Moe WMNT/USDT LPs).
- **ERC-8004 Identity & Reputation:** Implements agent registry and reputation score tracking on-chain on Mantle L2, linking agent decision logs directly to an EVM NFT.
- **Multi-DEX Scanner:** Polling daemons compare slot0 price states on Agni and Merchant Moe pools, verifying Net Arbitrage Profitability (NAP) before proposing execution routes.
- **Casper Network Integration:** Uses `casper-mcp-py` and `kinetifi-mcp` to fetch balances and calculate Casper DEX yields using live daily volume data from CSPR.cloud APIs.
- **100% Mocked Test Suite:** Verified via a complete, offline test suite for FastMCP tools and agent loops, ensuring rapid, deterministic development.

---

## 🎯 Hackathon Track Alignment
- **Agentic Wallets & Economy (Mantle):** KinetiFi acts as a secure, "headless" wallet OS. It leverages ERC-8004 identity to safely manage capital based on human intent, mathematically enforced risk boundaries, and isolated transaction signing.
- **AI Trading & Strategy:** Implements dynamic liquidity provision, cross-DEX arbitrage, and automated portfolio health balancing as pluggable, autonomous tools across both the Mantle and Casper networks.
