'use client';

import React, { useEffect, useState, useRef } from 'react';

type TelemetryEvent = {
  timestamp: string;
  level: string;
  component: string;
  action: string;
  description: string;
  metadata: any;
};

export default function TelemetryFeed() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/telemetry');

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setEvents((prev) => [...prev, parsed]);
      } catch (err) {
        console.error("Error parsing telemetry event:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const clearTelemetry = () => setEvents([]);

  const getColor = (level: string) => {
    switch (level) {
      case 'SUCCESS': return 'text-emerald-400';
      case 'WARN': return 'text-amber-400';
      case 'ERROR': return 'text-red-400';
      case 'INFO': return 'text-cyan-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 flex flex-col h-full lg:min-h-[650px] space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
            <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Live Telemetry Terminal</span>
            </div>
            <button onClick={clearTelemetry} className="text-slate-500 hover:text-slate-300 transition text-xs flex items-center">
                <i className="fa-solid fa-trash-can mr-1"></i>Clear
            </button>
        </div>

        {/* Streaming Log Console */}
        <div className="flex-1 bg-slate-950/85 border border-slate-900/60 rounded-lg p-4 font-mono text-xs overflow-y-auto space-y-3 relative scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {events.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-600">
                    <i className="fa-solid fa-code text-3xl mb-3 text-slate-800"></i>
                    <span className="text-xs">Console Idle. Engage the Agent in the Playground to stream live telemetry events.</span>
                </div>
            ) : (
                events.map((evt, idx) => (
                    <div key={idx} className={`p-3 rounded bg-slate-950/80 border border-slate-900 hover:border-slate-800 transition duration-150 ${getColor(evt.level)}`}>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                            <span>{new Date(evt.timestamp).toLocaleString()}</span>
                            <span className="font-bold border border-current px-1 rounded text-[9px]">{evt.level}</span>
                        </div>
                        <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5 mb-1">
                            <span className="text-cyan-400">[{evt.component}]</span> {evt.action}
                        </div>
                        <p className="text-slate-300 leading-relaxed mb-2">{evt.description}</p>
                        <details className="text-[10px]">
                            <summary className="cursor-pointer text-slate-500 hover:text-slate-400 select-none list-item">Show Raw Event Metrics</summary>
                            <pre className="mt-2 p-2 bg-slate-950/90 rounded text-slate-400 overflow-x-auto max-w-full">
                                {JSON.stringify(evt.metadata, null, 2)}
                            </pre>
                        </details>
                    </div>
                ))
            )}
            <div ref={bottomRef} className="h-1" />
        </div>
    </div>
  );
}
