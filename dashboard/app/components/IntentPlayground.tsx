'use client';

import React, { useState } from 'react';

export default function IntentPlayground() {
  const [intent, setIntent] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  const simulateIntentParsing = async () => {
    if (!intent.trim()) {
      alert("Please enter or select an intent instruction first!");
      return;
    }
    
    setIsExecuting(true);
    
    try {
      await fetch('/api/telemetry/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent })
      });
    } catch (e) {
      console.error(e);
    }
    
    setTimeout(() => {
      setIsExecuting(false);
    }, 5000); 
  };

  return (
    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6 flex flex-col space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-cyan-400/5 blur-[80px] rounded-full pointer-events-none"></div>
        
        <div className="flex justify-between items-center relative z-10">
            <div>
                <h2 className="text-lg font-bold tracking-wide">Intent Playground</h2>
                <p className="text-xs text-slate-500">Instruct the local agent offline using natural language intents.</p>
            </div>
            <span className="px-2.5 py-0.5 bg-cyan-950/40 border border-cyan-400/30 text-cyan-400 font-mono text-[10px] rounded-full font-semibold">Ollama: Qwen2.5</span>
        </div>

        {/* Interactive Templates */}
        <div className="space-y-1.5 relative z-10">
            <label className="text-xs font-semibold text-slate-400 block">Select Strategy Template:</label>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setIntent('Swap 0.1 WMETH for USDC instantly on Mantle')} className="text-left px-3 py-2 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-lg text-xs transition duration-200 hover:bg-slate-900 group">
                    <span className="font-bold text-cyan-400 block mb-0.5 group-hover:text-cyan-300">Tactical Swap</span>
                    <span className="text-slate-500 text-[10px] block truncate group-hover:text-slate-400">Swap 0.1 WMETH to USDC</span>
                </button>
                <button onClick={() => setIntent('Check current asset balances before checking WMETH pools')} className="text-left px-3 py-2 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-lg text-xs transition duration-200 hover:bg-slate-900 group">
                    <span className="font-bold text-purple-400 block mb-0.5 group-hover:text-purple-300">Pre-flight Audit</span>
                    <span className="text-slate-500 text-[10px] block truncate group-hover:text-slate-400">Check pools and balances</span>
                </button>
            </div>
        </div>

        {/* Intent Input Field */}
        <div className="space-y-2 relative z-10">
            <label className="text-xs font-semibold text-slate-400 block">Or enter custom instructions:</label>
            <textarea 
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={3} 
              className="w-full bg-slate-950 border border-slate-900 rounded-lg p-3 text-sm focus:outline-none focus:border-cyan-400 transition duration-300 font-mono text-slate-200 resize-none" 
              placeholder="E.g., Rebalance stablecoins..."></textarea>
        </div>

        <button 
          onClick={simulateIntentParsing} 
          disabled={isExecuting}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg transition duration-300 flex items-center justify-center space-x-2 text-sm glow-cyan disabled:opacity-50 relative z-10">
            {isExecuting ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-play"></i>}
            <span>{isExecuting ? 'Processing Pipeline...' : 'Engage KinetiFi Agent'}</span>
        </button>
    </div>
  );
}
