"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TerminalSquare, Pause, Play, Trash2 } from "lucide-react";
import clsx from "clsx";

interface TelemetryLine {
  ts?: string;
  timestamp?: string;
  level: string;
  component: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export function ExecutionTerminal() {
  const [telemetry, setTelemetry] = useState<TelemetryLine[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const fetchTelemetry = useCallback(async () => {
    if (isPaused) return;
    try {
      const res = await fetch("http://localhost:8000/api/telemetry");
      if (!res.ok) return;
      const data = await res.json();
      if (data.events && Array.isArray(data.events)) {
        setTelemetry(data.events.slice(-100));
      }
    } catch {
      // Fail silently
    }
  }, [isPaused]);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  useEffect(() => {
    if (!isPaused && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [telemetry, isPaused]);

  const handleClear = async () => {
    try {
      await fetch("http://localhost:8000/api/telemetry", { method: "DELETE" });
      setTelemetry([]);
    } catch {}
  };

  const getLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "ERROR": return "text-rose-400";
      case "WARN":
      case "WARNING": return "text-amber-400";
      case "SUCCESS": return "text-emerald-400";
      default: return "text-sky-300";
    }
  };

  return (
    <div className="flex flex-col h-80 bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl mt-6">
      <div className="h-12 flex items-center justify-between px-4 bg-[#1e1e1e] border-b border-white/5">
        <div className="flex items-center gap-2 text-slate-300">
          <TerminalSquare className="w-5 h-5 text-slate-400" />
          <span className="font-mono text-sm tracking-wide">Execution Terminal</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title={isPaused ? "Resume Auto-scroll" : "Pause Auto-scroll"}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button 
            onClick={handleClear}
            className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-rose-400 transition-colors"
            title="Clear Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs sm:text-sm text-emerald-400/90"
      >
        <div className="mb-4 text-sky-400/80">
          $ kinetifi-agent skills --watch<br/>
          [SYSTEM] Advanced Skills engine initialized.<br/>
          [SYSTEM] Subscribing to block events on Mantle Network...
        </div>

        {telemetry.length === 0 ? (
          <div className="flex items-center gap-2 opacity-50 mt-4">
            <span className="w-2 h-4 bg-emerald-400 animate-pulse inline-block" />
            Awaiting background skill execution...
          </div>
        ) : (
          <div className="space-y-1.5">
            {telemetry.map((line, i) => {
              const time = (line.ts || line.timestamp || "")?.slice(11, 19) || "--:--:--";
              return (
                <div key={i} className="hover:bg-white/[0.04] -mx-4 px-4 py-0.5 transition-colors">
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-slate-600">{time}</span>
                    <span className={clsx("font-bold", getLevelColor(line.level))}>
                      [{line.level?.slice(0, 4).toUpperCase()}]
                    </span>
                    <span className="text-violet-400">[{line.component}]</span>
                    <span className="text-slate-300">{line.description}</span>
                  </div>
                </div>
              );
            })}
            {!isPaused && (
              <div className="flex items-center gap-2 opacity-50 mt-2">
                <span className="w-2 h-4 bg-emerald-400 animate-pulse inline-block" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
