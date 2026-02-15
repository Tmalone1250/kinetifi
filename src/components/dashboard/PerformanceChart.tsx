import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { portfolioPerformance } from './mockData';
import { TrendingUp, Maximize2 } from 'lucide-react';

const timeRanges = ['24H', '7D', '30D', '90D', '1Y', 'ALL'];

// Generate different data for different time ranges
const generateData = (range: string) => {
  switch (range) {
    case '24H':
      return [
        { date: '00:00', value: 139800 },
        { date: '04:00', value: 140200 },
        { date: '08:00', value: 139500 },
        { date: '12:00', value: 141000 },
        { date: '16:00', value: 140800 },
        { date: '20:00', value: 141500 },
        { date: 'Now', value: 142500 },
      ];
    case '7D':
      return [
        { date: 'Feb 8', value: 136500 },
        { date: 'Feb 9', value: 137800 },
        { date: 'Feb 10', value: 138200 },
        { date: 'Feb 11', value: 137500 },
        { date: 'Feb 12', value: 139100 },
        { date: 'Feb 13', value: 140800 },
        { date: 'Feb 14', value: 142500 },
      ];
    case '90D':
      return [
        { date: 'Nov', value: 98000 },
        { date: 'Dec 1', value: 105000 },
        { date: 'Dec 15', value: 112000 },
        { date: 'Jan 1', value: 118000 },
        { date: 'Jan 15', value: 125000 },
        { date: 'Feb 1', value: 135000 },
        { date: 'Feb 14', value: 142500 },
      ];
    case '1Y':
      return [
        { date: 'Mar', value: 52000 },
        { date: 'May', value: 68000 },
        { date: 'Jul', value: 85000 },
        { date: 'Sep', value: 78000 },
        { date: 'Nov', value: 98000 },
        { date: 'Jan', value: 125000 },
        { date: 'Feb', value: 142500 },
      ];
    case 'ALL':
      return [
        { date: '2024', value: 25000 },
        { date: 'Q2', value: 42000 },
        { date: 'Q3', value: 58000 },
        { date: 'Q4', value: 78000 },
        { date: '2025', value: 95000 },
        { date: 'Q2', value: 118000 },
        { date: 'Now', value: 142500 },
      ];
    default:
      return portfolioPerformance;
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-lg px-4 py-3 shadow-xl"
        style={{
          background: 'linear-gradient(135deg, #141836 0%, #0F1230 100%)',
          border: '1px solid rgba(0,212,255,0.2)',
        }}
      >
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className="text-lg font-bold text-white font-mono">
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const PerformanceChart: React.FC = () => {
  const [activeRange, setActiveRange] = useState('30D');
  const data = generateData(activeRange);

  return (
    <div
      className="rounded-xl p-5 h-full"
      style={{
        background: 'rgba(15, 20, 50, 0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#00D4FF]/10">
            <TrendingUp size={16} className="text-[#00D4FF]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Portfolio Performance</h3>
            <p className="text-xs text-gray-500">Track your portfolio value over time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setActiveRange(range)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  activeRange === range
                    ? 'bg-[#00D4FF]/15 text-[#00D4FF]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] text-gray-500 hover:text-gray-300 transition-all">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#00D4FF" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00D4FF" />
                <stop offset="100%" stopColor="#00FFA3" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#4a5568', fontSize: 11 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#4a5568', fontSize: 11 }}
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              dx={-10}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="url(#lineGradient)"
              strokeWidth={2.5}
              fill="url(#portfolioGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: '#00D4FF',
                stroke: '#0A0E27',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PerformanceChart;
