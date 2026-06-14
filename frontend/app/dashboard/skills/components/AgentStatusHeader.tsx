import { ShieldCheck, Activity, Wallet } from "lucide-react";

export function AgentStatusHeader() {
  return (
    <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-slate-900 border-b border-white/10 shadow-sm z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-3">
            Zero-Trust Agent
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 tracking-widest uppercase shadow-[0_0_10px_rgba(244,63,94,0.2)]">
              Demo Mode: Force-Trigger Enabled
            </span>
          </h1>
          <p className="text-xs text-emerald-400 font-mono">STATUS: OPERATIONAL</p>
        </div>
      </div>
      
      <div className="flex gap-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Activity className="w-4 h-4" />
          <span>Mantle Network</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Wallet className="w-4 h-4" />
          <span className="font-mono">Vault Linked</span>
        </div>
      </div>
    </div>
  );
}
