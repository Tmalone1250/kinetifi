'use client';

import { useState, useEffect } from 'react';
import OnboardingModal from './components/OnboardingModal';
import TelemetryFeed from './components/TelemetryFeed';
import BalancesCard from './components/BalancesCard';
import StrategyPanel from './components/StrategyPanel';
import IntentPlayground from './components/IntentPlayground';
import FlywheelStats from './components/FlywheelStats';

export default function Dashboard() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [flywheelData, setFlywheelData] = useState<{ ltv: number; debt: number; status: 'HEALTHY' | 'CRITICAL' | 'REBALANCING' }>({ ltv: 0, debt: 0, status: 'HEALTHY' });
  const [isFlywheelActive, setIsFlywheelActive] = useState(false);

  useEffect(() => {
    // Listen for toggle updates from StrategyPanel
    const handleToggleEvent = (e: any) => setIsFlywheelActive(e.detail);
    window.addEventListener('flywheelToggle', handleToggleEvent);
    
    const eventSource = new EventSource('/api/telemetry');

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.component === 'ltv_monitor' && parsed.action === 'metrics_calculated') {
          setFlywheelData(prev => ({
            ltv: parsed.metadata.ltv !== undefined ? parsed.metadata.ltv : prev.ltv,
            debt: parsed.metadata.debt !== undefined ? parsed.metadata.debt : prev.debt,
            status: parsed.metadata.status
          }));
        }
      } catch (err) {
        // ignore parsing errors
      }
    };

    return () => {
        eventSource.close();
        window.removeEventListener('flywheelToggle', handleToggleEvent);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Premium Top Navigation */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
            <div className="h-9 w-9 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center glow-cyan">
                <i className="fa-solid fa-infinity text-slate-950 font-bold text-lg"></i>
            </div>
            <div>
                <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">KinetiFi</span>
                <span className="text-xs block text-slate-500 uppercase tracking-widest font-semibold">Autonomous Wallet OS</span>
            </div>
        </div>

        <div className="flex items-center space-x-6">
            {/* ERC-8004 Identity Badge */}
            <div className="bg-slate-900/60 border border-cyan-400/20 px-4 py-1.5 rounded-full flex items-center space-x-2 text-xs hidden sm:flex">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse-slow"></span>
                <span className="text-slate-400">Agent ID:</span>
                <span className="font-mono text-cyan-400 font-bold tracking-wider">ERC-8004 #0529</span>
            </div>
            {/* Connection Status */}
            <div className="flex items-center space-x-2 text-xs text-slate-400">
                <i className="fa-solid fa-circle-nodes text-emerald-400 text-sm"></i>
                <span className="font-medium">Mantle Testnet Active</span>
            </div>
        </div>
      </header>

      {/* Main Workspace Dashboard Grid */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 relative">
        {!isOnboarded ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm rounded-xl">
            <OnboardingModal onComplete={() => setIsOnboarded(true)} />
          </div>
        ) : null}

        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 transition-opacity duration-700 ${!isOnboarded ? 'opacity-30 pointer-events-none blur-sm' : 'opacity-100'}`}>
          {/* COLUMN 1: Agent & Wallet State (3/12 width) */}
          <section className="lg:col-span-3 flex flex-col space-y-6">
              <BalancesCard />
              
              {/* ERC-8004 Verification Metrics */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 flex flex-col space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                      <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Agent Provenance</span>
                      <i className="fa-solid fa-shield-halved text-cyan-400"></i>
                  </div>
                  <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Identity Score:</span>
                          <span className="font-mono text-cyan-400 font-bold">98.4% Compliance</span>
                      </div>
                      <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Assigned Validator:</span>
                          <span className="font-mono text-slate-300">Mantle-Core-Oracle #4</span>
                      </div>
                      <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Transaction Status:</span>
                          <span className="font-mono text-emerald-400 font-bold">0 Failed Actions</span>
                      </div>
                  </div>
              </div>

              {/* Safe Token Whitelist Indicator */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 flex flex-col space-y-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Pre-Flight Safeguards</span>
                  <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 rounded-md text-xs font-mono font-bold">MNT Whitelisted</span>
                      <span className="px-2.5 py-1 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 rounded-md text-xs font-mono font-bold">USDC Whitelisted</span>
                      <span className="px-2.5 py-1 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 rounded-md text-xs font-mono font-bold">WMETH Whitelisted</span>
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed pt-2">
                      All non-whitelisted assets are strictly blocked at the CLI wrapper layer to protect agent capital.
                  </div>
              </div>
          </section>

          {/* COLUMN 2: Intent Playground & Active Strategy (5/12 width) */}
          <section className="lg:col-span-5 flex flex-col space-y-6">
              <IntentPlayground />
              <FlywheelStats {...flywheelData} isActive={isFlywheelActive} />
              <StrategyPanel />
          </section>

          {/* COLUMN 3: Live Telemetry Event Stream (4/12 width) */}
          <section className="lg:col-span-4 flex flex-col h-full max-h-[85vh]">
              <TelemetryFeed />
          </section>
        </div>
      </main>
    </div>
  );
}
