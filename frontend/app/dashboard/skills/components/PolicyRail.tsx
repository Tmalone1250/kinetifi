import { ShieldAlert, AlertTriangle } from "lucide-react";

export function PolicyRail() {
  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex items-center gap-2 mb-6 relative z-10">
        <ShieldAlert className="w-5 h-5 text-rose-400" />
        <h2 className="font-semibold text-slate-100 text-lg">Global Policy Rail</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <div className="space-y-2">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-medium">Max Daily Gas Budget</label>
          <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-3 py-2">
            <input type="text" defaultValue="5.0" className="bg-transparent w-full text-sm text-slate-200 outline-none" />
            <span className="text-xs text-slate-500">MNT</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-medium">Max Notional Per Trade</label>
          <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-3 py-2">
            <input type="text" defaultValue="10000" className="bg-transparent w-full text-sm text-slate-200 outline-none" />
            <span className="text-xs text-slate-500">USD</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-medium">Min Wallet Reserve</label>
          <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-3 py-2">
            <input type="text" defaultValue="10.0" className="bg-transparent w-full text-sm text-slate-200 outline-none" />
            <span className="text-xs text-slate-500">MNT</span>
          </div>
        </div>

        <div className="space-y-2 flex flex-col justify-end">
          <button className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg py-2.5 text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            <AlertTriangle className="w-4 h-4" />
            EMERGENCY STOP
          </button>
        </div>
      </div>
    </div>
  );
}
