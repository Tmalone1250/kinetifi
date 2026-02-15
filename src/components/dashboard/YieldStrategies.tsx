import React, { useState } from 'react';
import { yieldStrategies, type YieldStrategy } from './mockData';
import {
  TrendingUp,
  Shield,
  Zap,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
} from 'lucide-react';

type RiskFilter = 'all' | 'low' | 'medium' | 'high';

const riskConfig: Record<string, { bg: string; text: string; icon: React.ElementType; border: string }> = {
  low: { bg: 'rgba(0,255,163,0.08)', text: '#00FFA3', icon: CheckCircle2, border: 'rgba(0,255,163,0.2)' },
  medium: { bg: 'rgba(255,184,0,0.08)', text: '#FFB800', icon: AlertTriangle, border: 'rgba(255,184,0,0.2)' },
  high: { bg: 'rgba(255,71,87,0.08)', text: '#FF4757', icon: Zap, border: 'rgba(255,71,87,0.2)' },
};

const StrategyCard: React.FC<{ strategy: YieldStrategy; onDeposit: (s: YieldStrategy) => void }> = ({
  strategy,
  onDeposit,
}) => {
  const risk = riskConfig[strategy.risk];
  const RiskIcon = risk.icon;

  return (
    <div
      className="rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 group"
      style={{
        background: 'rgba(15, 20, 50, 0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-base font-semibold text-white">{strategy.name}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{strategy.protocol}</p>
        </div>
        <span
          className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full"
          style={{ background: risk.bg, color: risk.text, border: `1px solid ${risk.border}` }}
        >
          <RiskIcon size={10} />
          {strategy.risk.charAt(0).toUpperCase() + strategy.risk.slice(1)}
        </span>
      </div>

      <div className="flex items-end gap-1 mb-4">
        <span className="text-3xl font-bold text-[#00FFA3] font-mono">{strategy.apy}%</span>
        <span className="text-xs text-gray-500 mb-1">APY</span>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed mb-4">{strategy.description}</p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">TVL</span>
          <span className="text-sm font-mono text-gray-300">{strategy.tvl}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Chain</span>
          <span className="text-xs text-gray-300 flex items-center gap-1">
            <Shield size={10} className="text-gray-500" />
            {strategy.chain}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Tokens</span>
          <div className="flex items-center gap-1">
            {strategy.tokens.map((t) => (
              <span
                key={t}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => onDeposit(strategy)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(0,255,163,0.1) 100%)',
          border: '1px solid rgba(0,212,255,0.25)',
          color: '#00D4FF',
        }}
      >
        Deposit
        <ArrowRight size={14} />
      </button>
    </div>
  );
};

const YieldStrategies: React.FC = () => {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [sortByApy, setSortByApy] = useState(true);
  const [depositModal, setDepositModal] = useState<YieldStrategy | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  let filtered = riskFilter === 'all' ? [...yieldStrategies] : yieldStrategies.filter((s) => s.risk === riskFilter);
  if (sortByApy) {
    filtered.sort((a, b) => b.apy - a.apy);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#00FFA3]/10">
            <TrendingUp size={16} className="text-[#00FFA3]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Yield Strategies</h3>
            <p className="text-xs text-gray-500">Discover and deploy capital into curated yield opportunities</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
            {(['all', 'low', 'medium', 'high'] as RiskFilter[]).map((r) => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                  riskFilter === r ? 'bg-[#00D4FF]/15 text-[#00D4FF]' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {r === 'all' ? 'All' : r}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSortByApy(!sortByApy)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              sortByApy ? 'bg-[#00FFA3]/15 text-[#00FFA3] border border-[#00FFA3]/20' : 'bg-white/[0.04] text-gray-500 border border-transparent'
            }`}
          >
            Sort by APY
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
        style={{
          background: 'rgba(0,212,255,0.06)',
          border: '1px solid rgba(0,212,255,0.12)',
        }}
      >
        <Info size={16} className="text-[#00D4FF] flex-shrink-0" />
        <p className="text-xs text-gray-400">
          APY rates are estimates based on current market conditions and may vary. Higher APY typically comes with higher risk.
          Always do your own research before depositing.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((strategy) => (
          <StrategyCard key={strategy.id} strategy={strategy} onDeposit={setDepositModal} />
        ))}
      </div>

      {/* Deposit Modal */}
      {depositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl p-6 mx-4"
            style={{
              background: 'linear-gradient(180deg, #111538 0%, #0D1130 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-1">
              Deposit to {depositModal.name}
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              {depositModal.protocol} · {depositModal.apy}% APY
            </p>

            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-2 block">Amount (USD)</label>
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span className="text-gray-500">$</span>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-white text-lg font-mono outline-none flex-1"
                />
                <button
                  onClick={() => setDepositAmount('10000')}
                  className="text-xs text-[#00D4FF] font-medium px-2 py-1 rounded bg-[#00D4FF]/10"
                >
                  MAX
                </button>
              </div>
            </div>

            {depositAmount && (
              <div className="mb-5 p-3 rounded-lg bg-white/[0.03]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Estimated yearly earnings</span>
                  <span className="text-[#00FFA3] font-mono font-bold">
                    ${((parseFloat(depositAmount) || 0) * depositModal.apy / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDepositModal(null);
                  setDepositAmount('');
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-white/[0.04] hover:bg-white/[0.08] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setDepositModal(null);
                  setDepositAmount('');
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: 'linear-gradient(135deg, #00D4FF 0%, #00FFA3 100%)',
                  color: '#0A0E27',
                }}
              >
                Confirm Deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YieldStrategies;
