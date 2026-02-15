import React, { useState } from 'react';
import { tokens, type Token } from './mockData';
import {
  Vault,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  Send,
  Plus,
  Search,
  Star,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
} from 'lucide-react';

const TokenIcon: React.FC<{ symbol: string; color: string; size?: number }> = ({
  symbol,
  color,
  size = 40,
}) => (
  <div
    className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
    style={{
      width: size,
      height: size,
      background: `${color}30`,
      border: `1px solid ${color}50`,
      fontSize: size * 0.3,
    }}
  >
    {symbol.slice(0, 2)}
  </div>
);

const AssetVault: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hideBalances, setHideBalances] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredTokens = tokens.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalValue = tokens.reduce((sum, t) => sum + t.value, 0);

  const handleCopy = () => {
    navigator.clipboard.writeText('0x71C4a3bF8e5c1D2F9eA7b6C8d4E3f2A1b0C9D8E');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#00D4FF]/10">
            <Vault size={16} className="text-[#00D4FF]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Asset Vault</h3>
            <p className="text-xs text-gray-500">Manage and track all your crypto assets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideBalances(!hideBalances)}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 transition-all"
          >
            {hideBalances ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            onClick={() => setShowReceiveModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.06] transition-all"
          >
            <ArrowDownLeft size={14} />
            Receive
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(0,255,163,0.1) 100%)',
              border: '1px solid rgba(0,212,255,0.25)',
              color: '#00D4FF',
            }}
          >
            <Send size={14} />
            Send
          </button>
        </div>
      </div>

      {/* Total value card */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(0,255,163,0.04) 100%)',
          border: '1px solid rgba(0,212,255,0.12)',
        }}
      >
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Portfolio Value</p>
        <p className="text-3xl font-bold text-white font-mono">
          {hideBalances ? '••••••' : `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <ArrowUpRight size={14} className="text-[#00FFA3]" />
          <span className="text-sm text-[#00FFA3] font-medium">+3.4%</span>
          <span className="text-xs text-gray-500 ml-1">past 24h</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] mb-4">
        <Search size={14} className="text-gray-500" />
        <input
          type="text"
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-sm text-white placeholder-gray-500 outline-none flex-1"
        />
      </div>

      {/* Token list */}
      <div className="space-y-2">
        {filteredTokens.map((token) => (
          <button
            key={token.id}
            onClick={() => setSelectedToken(selectedToken?.id === token.id ? null : token)}
            className={`w-full rounded-xl p-4 transition-all duration-200 text-left ${
              selectedToken?.id === token.id ? 'ring-1 ring-[#00D4FF]/30' : ''
            }`}
            style={{
              background: 'rgba(15, 20, 50, 0.5)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center gap-4">
              <TokenIcon symbol={token.symbol} color={token.color} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{token.name}</p>
                    <p className="text-xs text-gray-500">{token.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-medium text-white">
                      {hideBalances ? '••••' : `$${token.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {hideBalances ? '••••' : `${token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${token.symbol}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500 font-mono">
                    ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      token.change24h >= 0 ? 'text-[#00FFA3]' : 'text-[#FF4757]'
                    }`}
                  >
                    {token.change24h >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {token.change24h > 0 ? '+' : ''}{token.change24h}%
                  </span>
                </div>
              </div>
            </div>

            {selectedToken?.id === token.id && (
              <div className="mt-4 pt-4 border-t border-white/[0.06] flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSendModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 transition-all"
                >
                  <Send size={12} /> Send
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReceiveModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 transition-all"
                >
                  <ArrowDownLeft size={12} /> Receive
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#00D4FF] transition-all"
                  style={{
                    background: 'rgba(0,212,255,0.1)',
                    border: '1px solid rgba(0,212,255,0.2)',
                  }}
                >
                  <ArrowUpRight size={12} /> Swap
                </button>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl p-6 mx-4"
            style={{
              background: 'linear-gradient(180deg, #111538 0%, #0D1130 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Send Token</h3>
              <button onClick={() => setShowSendModal(false)} className="text-gray-500 hover:text-gray-300">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Recipient Address</label>
                <input
                  type="text"
                  value={sendAddress}
                  onChange={(e) => setSendAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-sm outline-none focus:border-[#00D4FF]/30"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Amount</label>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-sm outline-none focus:border-[#00D4FF]/30"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-white/[0.04] hover:bg-white/[0.08] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowSendModal(false);
                    setSendAddress('');
                    setSendAmount('');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #00D4FF 0%, #00FFA3 100%)',
                    color: '#0A0E27',
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl p-6 mx-4 text-center"
            style={{
              background: 'linear-gradient(180deg, #111538 0%, #0D1130 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Receive Tokens</h3>
              <button onClick={() => setShowReceiveModal(false)} className="text-gray-500 hover:text-gray-300">
                <X size={18} />
              </button>
            </div>
            {/* QR placeholder */}
            <div className="w-48 h-48 mx-auto rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mb-4">
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-sm ${Math.random() > 0.4 ? 'bg-white' : 'bg-transparent'}`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-2">Your wallet address</p>
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] mx-auto max-w-xs">
              <span className="text-xs font-mono text-gray-300 truncate">
                0x71C4a3bF8e5c...b0C9D8E
              </span>
              <button onClick={handleCopy} className="text-gray-500 hover:text-[#00D4FF] transition-colors flex-shrink-0">
                {copied ? <Check size={14} className="text-[#00FFA3]" /> : <Copy size={14} />}
              </button>
            </div>
            <button
              onClick={() => setShowReceiveModal(false)}
              className="mt-5 px-6 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-white/[0.04] hover:bg-white/[0.08] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetVault;
