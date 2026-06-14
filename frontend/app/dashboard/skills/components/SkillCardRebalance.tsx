"use client";

import { useState } from "react";
import { Scale, RefreshCw, Save, Play } from "lucide-react";
import clsx from "clsx";

export function SkillCardRebalance() {
  const [enabled, setEnabled] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  const handleForceTrigger = async () => {
    setIsTriggering(true);
    try {
      await fetch("http://localhost:8000/api/demo/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: "rebalance" })
      });
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => setIsTriggering(false), 1500);
  };
  
  return (
    <div className={clsx(
      "flex flex-col bg-slate-950 border rounded-2xl overflow-hidden transition-all duration-300",
      enabled ? "border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.1)]" : "border-white/10"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "p-2 rounded-lg transition-colors duration-300",
            enabled ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-slate-500"
          )}>
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-100">Active Rebalance</h2>
            <p className="text-xs text-slate-400">LB active bin concentration</p>
          </div>
        </div>
        
        {/* Toggle */}
        <button 
          onClick={() => setEnabled(!enabled)}
          className={clsx(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-950",
            enabled ? "bg-violet-500" : "bg-slate-700"
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
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Target Vault</label>
          <select className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/50 transition-colors appearance-none">
            <option>KinetiFi Vault (WMNT/USDT)</option>
            <option>KinetiFi Vault (mETH/USDT)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Bin Drift Threshold</label>
            <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-3 py-2 focus-within:border-violet-500/50 transition-colors">
              <input type="text" defaultValue="5" className="bg-transparent w-full text-sm text-slate-200 outline-none" />
              <span className="text-xs text-slate-500">Bins</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Reposition Cooldown</label>
            <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-3 py-2 focus-within:border-violet-500/50 transition-colors">
              <input type="text" defaultValue="12" className="bg-transparent w-full text-sm text-slate-200 outline-none" />
              <span className="text-xs text-slate-500">Hrs</span>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="flex justify-between text-xs text-slate-400">
            <span>Reposition Slippage</span>
            <span className="text-violet-400">1.0%</span>
          </label>
          <input type="range" min="0.1" max="5.0" step="0.1" defaultValue="1.0" className="w-full accent-violet-500 bg-slate-800 rounded-lg h-1 appearance-none cursor-pointer" />
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="p-4 bg-black/20 border-t border-white/5 flex justify-between items-center">
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Last run: 2h ago
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
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors text-slate-200">
            <Save className="w-4 h-4 text-slate-400" />
            Save Policy
          </button>
        </div>
      </div>
    </div>
  );
}
