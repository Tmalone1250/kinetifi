import React from 'react';
import { DollarSign, TrendingUp, Layers, Percent, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCard {
  title: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;
  borderColor: string;
}

const metrics: MetricCard[] = [
  {
    title: 'Net Worth',
    value: '$142,500',
    change: '+$4,720',
    changePositive: true,
    subtitle: 'vs. last week',
    icon: DollarSign,
    gradient: 'linear-gradient(135deg, rgba(0,212,255,0.12) 0%, rgba(0,212,255,0.04) 100%)',
    borderColor: 'rgba(0,212,255,0.15)',
  },
  {
    title: '24h Change',
    value: '+3.4%',
    change: '+$4,845',
    changePositive: true,
    subtitle: 'across all assets',
    icon: TrendingUp,
    gradient: 'linear-gradient(135deg, rgba(0,255,163,0.12) 0%, rgba(0,255,163,0.04) 100%)',
    borderColor: 'rgba(0,255,163,0.15)',
  },
  {
    title: 'Active DeFi Positions',
    value: '8',
    subtitle: 'across 5 protocols',
    icon: Layers,
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.04) 100%)',
    borderColor: 'rgba(139,92,246,0.15)',
  },
  {
    title: 'Estimated APY',
    value: '12.4%',
    change: 'Medium Risk',
    changePositive: true,
    subtitle: 'weighted average',
    icon: Percent,
    gradient: 'linear-gradient(135deg, rgba(255,184,0,0.12) 0%, rgba(255,184,0,0.04) 100%)',
    borderColor: 'rgba(255,184,0,0.15)',
  },
];

const MetricsCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.title}
            className="group relative rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 cursor-default"
            style={{
              background: metric.gradient,
              border: `1px solid ${metric.borderColor}`,
              animationDelay: `${index * 100}ms`,
            }}
          >
            {/* Hover glow effect */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: metric.gradient,
                filter: 'blur(20px)',
                zIndex: -1,
              }}
            />

            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${metric.borderColor}`,
                }}
              >
                <Icon size={20} style={{ color: metric.borderColor.replace('0.15', '1') }} />
              </div>
              {metric.change && (
                <div className="flex items-center gap-1">
                  {metric.changePositive ? (
                    <ArrowUpRight size={14} className="text-[#00FFA3]" />
                  ) : (
                    <ArrowDownRight size={14} className="text-[#FF4757]" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      metric.changePositive ? 'text-[#00FFA3]' : 'text-[#FF4757]'
                    }`}
                  >
                    {metric.change}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
              {metric.title}
            </p>
            <p className="text-2xl font-bold text-white tracking-tight">{metric.value}</p>
            {metric.subtitle && (
              <p className="text-xs text-gray-500 mt-1">{metric.subtitle}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MetricsCards;
