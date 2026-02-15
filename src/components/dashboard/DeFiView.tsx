import React from 'react';
import DeFiPositions from './DeFiPositions';
import { defiPositions } from './mockData';
import { Layers, DollarSign, TrendingUp, Shield, AlertTriangle } from 'lucide-react';

const DeFiView: React.FC = () => {
  const totalTVL = defiPositions.reduce((sum, p) => sum + p.tvl, 0);
  const totalFees = defiPositions
    .filter((p) => p.unclaimedFees)
    .reduce((sum, p) => sum + (p.unclaimedFees || 0), 0);
  const avgApy =
    defiPositions.reduce((sum, p) => sum + p.apy, 0) / defiPositions.length;
  const highRiskCount = defiPositions.filter((p) => p.risk === 'high').length;

  const summaryCards = [
    {
      label: 'Total Value Locked',
      value: `$${totalTVL.toLocaleString()}`,
      icon: DollarSign,
      color: '#00D4FF',
    },
    {
      label: 'Unclaimed Fees',
      value: `$${totalFees.toFixed(2)}`,
      icon: TrendingUp,
      color: '#00FFA3',
    },
    {
      label: 'Average APY',
      value: `${avgApy.toFixed(1)}%`,
      icon: Layers,
      color: '#8B5CF6',
    },
    {
      label: 'High Risk Positions',
      value: `${highRiskCount}`,
      icon: AlertTriangle,
      color: highRiskCount > 0 ? '#FFB800' : '#00FFA3',
    },
  ];

  return (
    <div>
      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl p-4"
              style={{
                background: `${card.color}08`,
                border: `1px solid ${card.color}15`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color: card.color }} />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-xl font-bold text-white font-mono">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Claim all banner */}
      {totalFees > 0 && (
        <div
          className="flex items-center justify-between px-5 py-3 rounded-xl mb-6"
          style={{
            background: 'linear-gradient(90deg, rgba(0,255,163,0.08) 0%, rgba(0,212,255,0.06) 100%)',
            border: '1px solid rgba(0,255,163,0.15)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#00FFA3]/15">
              <TrendingUp size={16} className="text-[#00FFA3]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                You have <span className="text-[#00FFA3] font-mono">${totalFees.toFixed(2)}</span> in unclaimed fees
              </p>
              <p className="text-xs text-gray-500">Claim all rewards across your positions</p>
            </div>
          </div>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'linear-gradient(135deg, #00FFA3 0%, #00D4FF 100%)',
              color: '#0A0E27',
            }}
          >
            Claim All
          </button>
        </div>
      )}

      <DeFiPositions />
    </div>
  );
};

export default DeFiView;
