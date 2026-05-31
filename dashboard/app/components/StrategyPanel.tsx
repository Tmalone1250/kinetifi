'use client';

import React, { useState } from 'react';

export default function StrategyPanel() {
  const [slippage, setSlippage] = useState("0.5%");
  const [psaActive, setPsaActive] = useState(true);

  return (
    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6 flex flex-col space-y-4">
        <div>
            <h2 className="text-lg font-bold tracking-wide">Pluggable Agentic Skills</h2>
            <p className="text-xs text-slate-500">Configure constraints and parameters for active tactical skills.</p>
        </div>

        <div className="space-y-3">
            {/* Slippage Protection */}
            <div className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-900 rounded-lg">
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded bg-cyan-400/10 flex items-center justify-center text-cyan-400"><i className="fa-solid fa-sliders"></i></div>
                    <div>
                        <span className="text-sm font-bold block">Slippage Guardrail</span>
                        <span className="text-[10px] text-slate-500">Max acceptable execution slippage</span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <input 
                      type="text" 
                      className="w-12 bg-slate-900 border border-slate-800 text-center font-mono text-xs py-1 rounded text-cyan-400 font-bold focus:outline-none focus:border-cyan-400" 
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                    />
                </div>
            </div>

            {/* Arbitrage Guard */}
            <div className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-900 rounded-lg">
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-400"><i className="fa-solid fa-scale-balanced"></i></div>
                    <div>
                        <span className="text-sm font-bold block">Peg Stability Arbitrage</span>
                        <span className="text-[10px] text-slate-500">Automatic pool balancing trigger</span>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={psaActive} onChange={() => setPsaActive(!psaActive)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-400 peer-checked:after:bg-slate-950"></div>
                </label>
            </div>
        </div>
    </div>
  );
}
