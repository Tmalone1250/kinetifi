import React, { useState, useMemo } from 'react';
import { transactions, type Transaction } from './mockData';
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Filter,
  History,
  Coins,
  Shield,
  Gift,
} from 'lucide-react';

type TxFilter = 'all' | 'swap' | 'send' | 'receive' | 'stake' | 'claim' | 'approve';

const txTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  swap: { icon: ArrowLeftRight, color: '#00D4FF', label: 'Swap' },
  send: { icon: ArrowUpRight, color: '#FF4757', label: 'Send' },
  receive: { icon: ArrowDownLeft, color: '#00FFA3', label: 'Receive' },
  approve: { icon: Shield, color: '#8B5CF6', label: 'Approve' },
  stake: { icon: Coins, color: '#FFB800', label: 'Stake' },
  unstake: { icon: Coins, color: '#FFB800', label: 'Unstake' },
  claim: { icon: Gift, color: '#00FFA3', label: 'Claim' },
};

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  confirmed: { icon: CheckCircle2, color: '#00FFA3', label: 'Confirmed' },
  pending: { icon: Clock, color: '#FFB800', label: 'Pending' },
  failed: { icon: XCircle, color: '#FF4757', label: 'Failed' },
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const TransactionRow: React.FC<{ tx: Transaction }> = ({ tx }) => {
  const typeConf = txTypeConfig[tx.type];
  const statusConf = statusConfig[tx.status];
  const TypeIcon = typeConf.icon;
  const StatusIcon = statusConf.icon;

  const getDescription = () => {
    switch (tx.type) {
      case 'swap':
        return `${tx.amountFrom} ${tx.tokenFrom} → ${tx.amountTo?.toLocaleString()} ${tx.tokenTo}`;
      case 'send':
        return `${tx.amount} ${tx.token}`;
      case 'receive':
        return `${tx.amount} ${tx.token}`;
      case 'approve':
        return `${tx.token} (Unlimited)`;
      case 'stake':
        return `${tx.amount} ${tx.token}`;
      case 'claim':
        return `${tx.amount} ${tx.token}`;
      default:
        return `${tx.amount} ${tx.token}`;
    }
  };

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${typeConf.color}15`, border: `1px solid ${typeConf.color}25` }}
      >
        <TypeIcon size={16} style={{ color: typeConf.color }} />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{typeConf.label}</span>
          <span
            className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: `${statusConf.color}15`, color: statusConf.color }}
          >
            <StatusIcon size={10} />
            {statusConf.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{getDescription()}</p>
      </div>

      {/* Hash & Time */}
      <div className="text-right hidden sm:block">
        <p className="text-xs font-mono text-gray-400">{tx.hash}</p>
        <p className="text-[10px] text-gray-600 mt-0.5">{formatTime(tx.timestamp)}</p>
      </div>

      {/* Gas */}
      <div className="text-right hidden md:block min-w-[70px]">
        <p className="text-xs text-gray-500">Gas</p>
        <p className="text-xs font-mono text-gray-400">${tx.gasFee.toFixed(2)}</p>
      </div>

      {/* External link */}
      <button className="w-7 h-7 rounded-md flex items-center justify-center text-gray-600 hover:text-[#00D4FF] hover:bg-white/[0.04] transition-all opacity-0 group-hover:opacity-100">
        <ExternalLink size={14} />
      </button>
    </div>
  );
};

const TransactionHistory: React.FC = () => {
  const [filter, setFilter] = useState<TxFilter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter((tx) => tx.type === filter);
  }, [filter]);

  const totalGas = transactions.reduce((sum, tx) => sum + tx.gasFee, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#00D4FF]/10">
            <History size={16} className="text-[#00D4FF]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Transaction History</h3>
            <p className="text-xs text-gray-500">
              {transactions.length} transactions · ${totalGas.toFixed(2)} total gas spent
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <Filter size={14} className="text-gray-500 flex-shrink-0" />
        {(['all', 'swap', 'send', 'receive', 'stake', 'claim', 'approve'] as TxFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap capitalize ${
              filter === f
                ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/20'
                : 'bg-white/[0.04] text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(15, 20, 50, 0.5)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {filtered.length > 0 ? (
          filtered.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-500">No transactions found for this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
