"use client";

import { useState } from "react";
import { Zap, RefreshCw, Save, Play } from "lucide-react";
import clsx from "clsx";

export function SkillCardArbitrage() {
  const [enabled, setEnabled] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  const handleForceTrigger = async () => {
    setIsTriggering(true);
    try {
      await fetch("http://localhost:8000/api/demo/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: "arbitrage" })
      });
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => setIsTriggering(false), 1500);
  };
  
  return (
    <div className={clsx(
      "flex flex-col bg-slate-950 border rounded-2xl overflow-hidden transition-all duration-300",
      enabled ? "border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.1)]" : "border-white/10"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "p-2 rounded-lg transition-colors duration-300",
            enabled ? "bg-sky-500/20 text-sky-400" : "bg-white/5 text-slate-500"
          )}>
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-100">Atomic Arbitrage</h2>
            <p className="text-xs text-slate-400">Flash-loan backed DEX spreads</p>
          </div>
        </div>
        
        {/* Toggle */}
        <button 
          onClick={() => setEnabled(!enabled)}
          className={clsx(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950",
            enabled ? "bg-sky-500" : "bg-slate-700"
          )}
        >
          <span className={clsx(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            enabled ? "translate-x-6" : "translate-x-1"
          )} />
        </button>
      </div>
      
      {/* Configuration */}
      <div className="p-5 flex-1 space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Target DEXes</label>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sm text-sky-300 cursor-pointer hover:bg-sky-500/20 transition-colors">Merchant Moe</span>
            <span className="px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sm text-sky-300 cursor-pointer hover:bg-sky-500/20 transition-colors">Agni</span>
            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-500 cursor-pointer hover:bg-white/10 transition-colors">FusionX</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Min Net Profit</label>
            <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-3 py-2 focus-within:border-sky-500/50 transition-colors">
              <input type="text" defaultValue="5.0" className="bg-transparent w-full text-sm text-slate-200 outline-none" />
              <span className="text-xs text-slate-500">USD</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Max Gas Cost</label>
            <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-3 py-2 focus-within:border-sky-500/50 transition-colors">
              <input type="text" defaultValue="0.1" className="bg-transparent w-full text-sm text-slate-200 outline-none" />
              <span className="text-xs text-slate-500">MNT</span>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="flex justify-between text-xs text-slate-400">
            <span>Slippage Tolerance</span>
            <span className="text-sky-400">0.5%</span>
          </label>
          <input type="range" min="0.1" max="5.0" step="0.1" defaultValue="0.5" className="w-full accent-sky-500 bg-slate-800 rounded-lg h-1 appearance-none cursor-pointer" />
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="p-4 bg-black/20 border-t border-white/5 flex justify-between items-center">
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Last run: 5m ago
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleForceTrigger}
            disabled={isTriggering}
            className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
          >
            <Play className={clsx("w-3.5 h-3.5", isTriggering && "animate-pulse")} />
            {isTriggering ? "Triggering..." : "Force Trigger"}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(14,165,233,0.2)]">
            <Save className="w-4 h-4" />
            Save Policy
          </button>
        </div>
      </div>
    </div>
  );
}
