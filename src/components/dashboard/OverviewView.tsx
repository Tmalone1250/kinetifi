import React from 'react';
import MetricsCards from './MetricsCards';
import PerformanceChart from './PerformanceChart';
import TokenAllocation from './TokenAllocation';
import AssetsTable from './AssetsTable';
import { defiPositions } from './mockData';
import {
  Droplets,
  ArrowUpDown,
  Coins,
  Shield,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface OverviewViewProps {
  onNavigate: (nav: 'defi') => void;
}

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

const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate }) => {
  // Show top 4 DeFi positions as preview
  const topPositions = defiPositions.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <MetricsCards />

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <PerformanceChart />
        </div>
        <div className="xl:col-span-1">
          <TokenAllocation />
        </div>
      </div>

      {/* Assets Table */}
      <AssetsTable />

      {/* DeFi Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Active DeFi Positions</h3>
          <button
            onClick={() => onNavigate('defi')}
            className="flex items-center gap-1 text-xs text-[#00D4FF] hover:text-[#00D4FF]/80 font-medium transition-colors"
          >
            View All
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {topPositions.map((pos) => {
            const Icon = typeIcons[pos.type];
            const color = typeColors[pos.type];
            return (
              <div
                key={pos.id}
                className="rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                style={{
                  background: 'rgba(15, 20, 50, 0.5)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${color}15` }}
                  >
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{pos.protocol}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{pos.type}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">APY</span>
                  <span className="text-sm font-mono font-bold text-[#00FFA3]">{pos.apy}%</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">TVL</span>
                  <span className="text-xs font-mono text-gray-300">${pos.tvl.toLocaleString()}</span>
                </div>
                {pos.healthFactor !== undefined && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">Health</span>
                    <span className="flex items-center gap-1">
                      {pos.healthFactor >= 2 ? (
                        <CheckCircle2 size={10} className="text-[#00FFA3]" />
                      ) : (
                        <AlertTriangle size={10} className="text-[#FFB800]" />
                      )}
                      <span className="text-xs font-mono text-gray-300">{pos.healthFactor.toFixed(2)}</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OverviewView;
