'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function BalancesCard() {
  const [balances, setBalances] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const res = await fetch('/api/balances');
        const data = await res.json();
        setBalances(data);
      } catch (err) {
        console.error("Failed to fetch balances", err);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!balances) {
    return (
      <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-8 flex flex-col space-y-4 items-center justify-center min-h-[250px]">
        <Loader2 className="animate-spin text-cyan-400 w-8 h-8" />
      </div>
    );
  }

  // Calculate mock USD values based on static rates for the demo
  const rates: Record<string, number> = {
    MNT: 0.80,
    WMETH: 1900.00,
    USDC: 1.00,
    USDY: 1.00
  };

  return (
    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 flex flex-col space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
          <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Active Portfolio</span>
          <i className="fa-solid fa-wallet text-slate-500"></i>
      </div>
      
      {/* MNT Token Balance */}
      <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950/40 border border-slate-900 hover:border-slate-800 transition">
          <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 font-bold">M</div>
              <div>
                  <span className="font-bold block text-sm">MNT</span>
                  <span className="text-xs text-slate-500">Mantle Native</span>
              </div>
          </div>
          <div className="text-right">
              <span className="font-mono font-bold block text-sm text-slate-200">
                {balances.MNT?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) || "0.00"}
              </span>
              <span className="text-xs text-slate-500">${((balances.MNT || 0) * rates.MNT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
      </div>

      {/* WMETH Balance */}
      <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950/40 border border-slate-900 hover:border-slate-800 transition">
          <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400"><i className="fa-brands fa-ethereum"></i></div>
              <div>
                  <span className="font-bold block text-sm">WMETH</span>
                  <span className="text-xs text-slate-500">Wrapped Ether</span>
              </div>
          </div>
          <div className="text-right">
              <span className="font-mono font-bold block text-sm text-slate-200">
                {balances.WMETH?.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) || "0.00"}
              </span>
              <span className="text-xs text-slate-500">${((balances.WMETH || 0) * rates.WMETH).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
      </div>

      {/* USDC Balance */}
      <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950/40 border border-slate-900 hover:border-slate-800 transition">
          <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400"><i className="fa-solid fa-dollar-sign"></i></div>
              <div>
                  <span className="font-bold block text-sm">USDC</span>
                  <span className="text-xs text-slate-500">Bridged Dollar</span>
              </div>
          </div>
          <div className="text-right">
              <span className="font-mono font-bold block text-sm text-slate-200">
                {balances.USDC?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
              </span>
              <span className="text-xs text-slate-500">${((balances.USDC || 0) * rates.USDC).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
      </div>
      
      {/* USDY Balance (if any) */}
      {(balances.USDY || 0) > 0 && (
      <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950/40 border border-slate-900 hover:border-slate-800 transition">
          <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400"><i className="fa-solid fa-coins"></i></div>
              <div>
                  <span className="font-bold block text-sm">USDY</span>
                  <span className="text-xs text-slate-500">Yield Dollar</span>
              </div>
          </div>
          <div className="text-right">
              <span className="font-mono font-bold block text-sm text-slate-200">
                {balances.USDY?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
              </span>
              <span className="text-xs text-slate-500">${((balances.USDY || 0) * rates.USDY).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
      </div>
      )}
    </div>
  );
}
