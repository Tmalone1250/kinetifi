import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { tokenAllocation } from './mockData';
import { PieChart as PieIcon } from 'lucide-react';

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#fff" fontSize={20} fontWeight={700}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize={13}>
        {(percent * 100).toFixed(0)}% · ${payload.amount?.toLocaleString()}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="none"
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 13}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.4}
        stroke="none"
      />
    </g>
  );
};

const TokenAllocation: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div
      className="rounded-xl p-5 h-full"
      style={{
        background: 'rgba(15, 20, 50, 0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#00FFA3]/10">
          <PieIcon size={16} className="text-[#00FFA3]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Token Allocation</h3>
          <p className="text-xs text-gray-500">Distribution across assets</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={tokenAllocation}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="value"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              stroke="none"
            >
              {tokenAllocation.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="space-y-2 mt-2">
        {tokenAllocation.map((token, index) => (
          <button
            key={token.name}
            onClick={() => setActiveIndex(index)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
              activeIndex === index
                ? 'bg-white/[0.06]'
                : 'hover:bg-white/[0.03]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: token.color }}
              />
              <span className="text-sm text-gray-300 font-medium">{token.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-gray-400">
                ${token.amount.toLocaleString()}
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: `${token.color}15`,
                  color: token.color,
                }}
              >
                {token.value}%
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TokenAllocation;
