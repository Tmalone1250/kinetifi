import React, { useState, useMemo } from 'react';
import { tokens, type Token } from './mockData';
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ArrowUpDown,
  ChevronDown,
  Star,
} from 'lucide-react';

// Mini sparkline component
const Sparkline: React.FC<{ data: number[]; positive: boolean }> = ({ data, positive }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const color = positive ? '#00FFA3' : '#FF4757';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`spark-${positive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#spark-${positive ? 'up' : 'down'})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Token icon component
const TokenIcon: React.FC<{ symbol: string; color: string }> = ({ symbol, color }) => (
  <div
    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
    style={{ background: `${color}30`, border: `1px solid ${color}50` }}
  >
    {symbol.slice(0, 2)}
  </div>
);

type SortKey = 'name' | 'price' | 'change24h' | 'balance' | 'value';
type SortDir = 'asc' | 'desc';

const AssetsTable: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['1', '3']));

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filteredTokens = useMemo(() => {
    let result = [...tokens];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal: number | string = a[sortKey];
      let bVal: number | string = b[sortKey];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [searchQuery, sortKey, sortDir]);

  const SortHeader: React.FC<{ label: string; sortKeyName: SortKey; align?: string }> = ({
    label,
    sortKeyName,
    align = 'left',
  }) => (
    <th className={`px-4 py-3 text-${align}`}>
      <button
        onClick={() => handleSort(sortKeyName)}
        className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors ${
          align === 'right' ? 'ml-auto' : ''
        } ${
          sortKey === sortKeyName ? 'text-[#00D4FF]' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        {label}
        <ArrowUpDown size={12} />
      </button>
    </th>
  );

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(15, 20, 50, 0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold text-white">Assets</h3>
          <p className="text-xs text-gray-500 mt-0.5">{tokens.length} tokens in your portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <Search size={14} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-gray-500 outline-none w-28"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="w-10 px-4 py-3" />
              <SortHeader label="Token" sortKeyName="name" />
              <SortHeader label="Price" sortKeyName="price" align="right" />
              <th className="px-4 py-3 text-right">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  7D Chart
                </span>
              </th>
              <SortHeader label="24h" sortKeyName="change24h" align="right" />
              <SortHeader label="Balance" sortKeyName="balance" align="right" />
              <SortHeader label="Value" sortKeyName="value" align="right" />
            </tr>
          </thead>
          <tbody>
            {filteredTokens.map((token) => (
              <tr
                key={token.id}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group cursor-pointer"
              >
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(token.id);
                    }}
                    className="transition-colors"
                  >
                    <Star
                      size={14}
                      className={
                        favorites.has(token.id)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-600 hover:text-gray-400'
                      }
                    />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <TokenIcon symbol={token.symbol} color={token.color} />
                    <div>
                      <p className="text-sm font-medium text-white">{token.name}</p>
                      <p className="text-xs text-gray-500">{token.symbol}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-mono text-white">
                    ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Sparkline data={token.sparkline} positive={token.change24h >= 0} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {token.change24h >= 0 ? (
                      <ArrowUpRight size={14} className="text-[#00FFA3]" />
                    ) : (
                      <ArrowDownRight size={14} className="text-[#FF4757]" />
                    )}
                    <span
                      className={`text-sm font-medium font-mono ${
                        token.change24h >= 0 ? 'text-[#00FFA3]' : 'text-[#FF4757]'
                      }`}
                    >
                      {token.change24h > 0 ? '+' : ''}
                      {token.change24h}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-mono text-gray-300">
                    {token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-mono font-medium text-white">
                    ${token.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
              </tr>
            ))}
            {filteredTokens.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  No tokens found matching "{searchQuery}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssetsTable;
