# **KinetiFi Demo Video Script**
**Target Duration:** 3.5 to 4 minutes (~550 words)  
**Tone:** Professional, innovative, clear, and high-tech.  
**Voiceover Service:** Optimized for ElevenLabs (natural pauses, phonetic clarity).  

---

## **Visual & Audio Flow**

| Time (Est.) | Visual / Screen Action | Audio / Voiceover Script |
| :--- | :--- | :--- |
| **0:00 - 0:30** | **[Screen: KinetiFi Landing Page & Main Dashboard]**<br>Hover over the connected wallet address and show the global state widgets (native MNT balance, wallet LTV status). | "Web3 interactions today are manual, fragmented, and complex. Users are forced to execute single transactions one by one, exposing themselves to high slippage, gas spikes, and human error. Meet KinetiFi: the first autonomous, Zero-Trust Agentic Wallet OS built natively for Mantle L2 and Casper Network. KinetiFi abstracts the entire complexity of DeFi into a secure, natural language interface." |
| **0:30 - 1:15** | **[Screen: AI Chat Interface]**<br>Type: `"Maximize yield on my native MNT."` and press enter. Show the message bubbles. Click on the expandable telemetry logs to show the agent thoughts. | "Unlike traditional bots, KinetiFi operates on a zero-trust model. The AI has no access to your private keys. Instead, a global Supervisor agent routes your goals to a dedicated Mantle yield agent. Using the Model Context Protocol, the agent queries active pools, calculates the highest yield opportunities, and prepares an atomic, unsigned transaction bundle for your approval. You remain in full cryptographic control." |
| **1:15 - 2:00** | **[Screen: Dashboard - Advanced Skills Tab]**<br>Click on the **Advanced Skills** link in the sidebar. Show the three-panel layout: **Arbitrage**, **Active Rebalancing**, and **Yield Auto-Compounding**. Hover over the **Global Policy Rail** inputs (Gas limit, Max slippage). | "For advanced users, KinetiFi introduces the Advanced Skills Command Center. This interface separates three of our core agentic strategies: cross-DEX arbitrage, active portfolio rebalancing, and auto-compounding. On the right, the Global Policy Rail enforces strict, zero-trust constraints. Even if the AI proposes a strategy, it cannot exceed your custom gas caps, slippage limits, or risk parameters." |
| **2:00 - 2:45** | **[Screen: Advanced Skills - Arbitrage Card]**<br>Click the **Force Trigger** button on the Arbitrage card. Immediately scroll down to the **Live Log Terminal** to show the simulated event logs streaming in real-time. | "Waiting for market opportunities to arise in a live demo is impractical, so we built a Force-Trigger Sandbox. By clicking Force Trigger on the Arbitrage Skill, we simulate a major whale dump on an Agni swap pool. Instantly, our multi-DEX scanner detects a price divergence against Merchant Moe, calculates the Net Arbitrage Profitability, and generates a cross-DEX flash-loan bundle." |
| **2:45 - 3:20** | **[Screen: Advanced Skills - Rebalance & Auto-Compound Cards]**<br>Click the **Force Trigger** button on the Rebalance card. Watch the log output. Then click the **Force Trigger** button on the Auto-Compound card. | "Next, we force-trigger our Active Rebalancing skill. The agent evaluates the wallet assets, calculates weight drifts outside our threshold, and prepares a two-step swap transaction to restore balance. Finally, triggering the Auto-Compound skill compiles a multi-step workflow that claims pending rewards from Lendle, swaps them for principal LP assets, and zaps them back into the pool to maximize compound interest." |
| **3:20 - 3:45** | **[Screen: AI Chat Interface - Emergency Stop]**<br>Type `"stop"` in the chat box (or click the prominent red **Emergency Stop** button). Show the logs outputting: `[CRITICAL] Emergency Stop Initiated. halting all agent loops.` | "Control is the cornerstone of KinetiFi. In any scenario, clicking the Emergency Stop button or simply typing 'stop' in the AI chat triggers an immediate backend override. The system locks down all sub-agents, purges pending transaction proposals, and halts all active execution loops instantly." |
| **3:45 - 4:15** | **[Screen: KinetiFi Landing Page or Repository Code]**<br>Show the directories (`mantle-mcp`, `kinetifi-mcp`) and show the FastAPI / Next.js local terminal outputs. | "Under the hood, KinetiFi is powered by a modular python backend, a high-performance Next.js 14 frontend, and specialized Model Context Protocol servers. It is built to bring institutional-grade execution to everyday Web3 users. KinetiFi is the autonomous, zero-trust keeper for your digital assets on Mantle L2. Thank you." |

---

## **Demo Preparation & Runlist**

To record this demo successfully, follow this sequence:

1. **Clean Slate:** Restart both the backend Uvicorn server and the Next.js frontend to clear the local logs database.
2. **Landing Page:** Start the video on the dashboard page showing your connected wallet and native MNT balance.
3. **Natural Language Test:** Enter `Maximize yield on my native MNT` in the AI Chat. Wait for the Supervisor to analyze the intent, call the Casper/Mantle MCP routers, and display the transaction widget showing the Aave Supply or Moe LP Zap proposal.
4. **Command Center Navigation:** Transition to the `/dashboard/skills` page. Explain the separation of skills and show the live terminal.
5. **Simulated State Shocks (Force Triggers):**
   - Click **Force Trigger** under *Arbitrage* to show the simulated whale dump and multi-DEX scanner logs.
   - Click **Force Trigger** under *Rebalance* to show how KinetiFi calculates bin step drift and prepares swap bundles.
   - Click **Force Trigger** under *Auto-Compound* to display Lendle reward harvesting and LP zapping.
6. **Security Test:** Click the **Emergency Stop** button to visually prove that the agent immediately enters a halted state.
