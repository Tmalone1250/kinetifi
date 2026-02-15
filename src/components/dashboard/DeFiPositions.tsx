import React, { useState } from 'react';
import { defiPositions, type DeFiPosition } from './mockData';
import {
  Droplets,
  ArrowUpDown,
  Shield,
  Coins,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Layers,
} from 'lucide-react';

type FilterType = 'all' | 'liquidity' | 'lending' | 'borrowing' | 'staking';

const filterOptions: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All Positions' },
  { id: 'liquidity', label: 'Liquidity' },
  { id: 'lending', label: 'Lending' },
  { id: 'borrowing', label: 'Borrowing' },
  { id: 'staking', label: 'Staking' },
];

const typeIcons: Record<string, React.ElementType> = {
  liquidity: Droplets,
  lending: ArrowUpDown,
  borrowing: ArrowUpDown,
  staking: Coins,
};

const typeColors: Record<string, string> = {
  liquidity: '#00D4FF',
  lending: '#00FFA3',
  borrowing: '#FFB800',
  staking: '#8B5CF6',
};

const riskColors: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'rgba(0,255,163,0.1)', text: '#00FFA3', label: 'Low Risk' },
  medium: { bg: 'rgba(255,184,0,0.1)', text: '#FFB800', label: 'Medium Risk' },
  high: { bg: 'rgba(255,71,87,0.1)', text: '#FF4757', label: 'High Risk' },
};

const HealthFactorBar: React.FC<{ value: number }> = ({ value }) => {
  const getColor = () => {
    if (value >= 2) return '#00FFA3';
    if (value >= 1.5) return '#FFB800';
    return '#FF4757';
  };
  const percentage = Math.min((value / 4) * 100, 100);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Health Factor</span>
        <div className="flex items-center gap-1">
          {value >= 2 ? (
            <CheckCircle2 size={12} style={{ color: getColor() }} />
          ) : (
            <AlertTriangle size={12} style={{ color: getColor() }} />
          )}
          <span className="text-sm font-mono font-bold" style={{ color: getColor() }}>
            {value.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${getColor()}80, ${getColor()})`,
          }}
        />
      </div>
    </div>
  );
};

const PositionCard: React.FC<{ position: DeFiPosition }> = ({ position }) => {
  const Icon = typeIcons[position.type];
  const color = typeColors[position.type];
  const risk = riskColors[position.risk];

  return (
    <div
      className="rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
      style={{
        background: 'rgba(15, 20, 50, 0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${color}15`, border: `1px solid ${color}30` }}
          >
            <Icon size={18} style={{ color }} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">{position.protocol}</h4>
            <p className="text-xs text-gray-500 capitalize">{position.type}</p>
          </div>
        </div>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: risk.bg, color: risk.text }}
        >
          {risk.label}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2">
        {position.pair && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Pair</span>
            <span className="text-sm font-mono text-white">{position.pair}</span>
          </div>
        )}

        {position.supplied !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Supplied</span>
            <span className="text-sm font-mono text-white">
              ${position.supplied.toLocaleString()}
            </span>
          </div>
        )}

        {position.borrowed !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Borrowed</span>
            <span className="text-sm font-mono text-[#FFB800]">
              ${position.borrowed.toLocaleString()}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">TVL</span>
          <span className="text-sm font-mono text-gray-300">
            ${position.tvl.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">APY</span>
          <span className="text-sm font-mono font-bold text-[#00FFA3]">
            {position.apy}%
          </span>
        </div>

        {position.unclaimedFees !== undefined && (
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <span className="text-xs text-gray-500">Unclaimed Fees</span>
            <span className="text-sm font-mono font-bold text-[#00D4FF]">
              ${position.unclaimedFees.toFixed(2)}
            </span>
          </div>
        )}

        {position.healthFactor !== undefined && (
          <HealthFactorBar value={position.healthFactor} />
        )}

        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <span className="text-[10px] text-gray-500 flex items-center gap-1">
            <Shield size={10} />
            {position.chain}
          </span>
          <button className="flex items-center gap-1 text-xs text-[#00D4FF] hover:text-[#00D4FF]/80 font-medium transition-colors">
            Manage
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

const DeFiPositions: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered =
    filter === 'all'
      ? defiPositions
      : defiPositions.filter((p) => p.type === filter);

  const totalTVL = defiPositions.reduce((sum, p) => sum + p.tvl, 0);
  const totalFees = defiPositions
    .filter((p) => p.unclaimedFees)
    .reduce((sum, p) => sum + (p.unclaimedFees || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10">
            <Layers size={16} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">DeFi Positions</h3>
            <p className="text-xs text-gray-500">
              {defiPositions.length} active · ${totalTVL.toLocaleString()} TVL · ${totalFees.toFixed(2)} unclaimed
            </p>
          </div>
        </div>
        <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                filter === opt.id
                  ? 'bg-[#00D4FF]/15 text-[#00D4FF]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {filtered.map((position) => (
          <PositionCard key={position.id} position={position} />
        ))}
      </div>
    </div>
  );
};

export default DeFiPositions;
