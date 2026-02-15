import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export type WalletType = 'metamask' | 'walletconnect' | 'coinbase';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ChainId = 1 | 10 | 42161 | 137 | 8453;

export interface ChainInfo {
  id: ChainId;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  color: string;
}

export interface WalletSession {
  address: string;
  walletType: WalletType;
  chainId: ChainId;
  connectedAt: number;
  ensName?: string;
}

export interface WalletContextType {
  // State
  status: ConnectionStatus;
  session: WalletSession | null;
  chain: ChainInfo | null;
  balance: string;
  error: string | null;

  // Derived
  isConnected: boolean;
  shortAddress: string;

  // Actions
  connect: (walletType: WalletType) => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: ChainId) => Promise<void>;
  openConnectModal: () => void;
  closeConnectModal: () => void;
  isModalOpen: boolean;
}

// ── Chain Registry ───────────────────────────────────────────────────────────

export const CHAINS: Record<ChainId, ChainInfo> = {
  1: {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com',
    explorerUrl: 'https://etherscan.io',
    color: '#627EEA',
  },
  10: {
    id: 10,
    name: 'Optimism',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    color: '#FF0420',
  },
  42161: {
    id: 42161,
    name: 'Arbitrum',
    symbol: 'ETH',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    color: '#28A0F0',
  },
  137: {
    id: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    color: '#8247E5',
  },
  8453: {
    id: 8453,
    name: 'Base',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    color: '#0052FF',
  },
};

// ── Simulated wallet addresses per wallet type ───────────────────────────────

const MOCK_WALLETS: Record<WalletType, { address: string; ensName?: string; balance: string }> = {
  metamask: {
    address: '0x71C4a3bF8e5c1D2F9eA7b6C8d4E3f2A1b08eC4',
    ensName: 'kinetifi.eth',
    balance: '17.5642',
  },
  walletconnect: {
    address: '0x9aB2d8E7fC3a1b5D6e4F0c8A7B9d2E1f3C5a6B8',
    balance: '12.3891',
  },
  coinbase: {
    address: '0x3dF7a2C8b1E9d4F6a5B0c7D8e2F1a3B5c6D7e8F',
    ensName: 'defi-chad.eth',
    balance: '24.1205',
  },
};

// ── Storage keys ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'kinetifi_wallet_session';

// ── Context ──────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = (): WalletContextType => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
};

// ── Provider ─────────────────────────────────────────────────────────────────

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [session, setSession] = useState<WalletSession | null>(null);
  const [balance, setBalance] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const connectingRef = useRef(false);

  // ── Restore session from localStorage on mount ──────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: WalletSession = JSON.parse(stored);
        // Validate session isn't too old (7 days)
        const maxAge = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - parsed.connectedAt < maxAge) {
          setSession(parsed);
          setBalance(MOCK_WALLETS[parsed.walletType]?.balance ?? '0');
          setStatus('connected');
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // ── Persist session to localStorage ─────────────────────────────────────
  useEffect(() => {
    if (session && status === 'connected') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [session, status]);

  // ── Derived state ───────────────────────────────────────────────────────
  const isConnected = status === 'connected' && session !== null;
  const chain = session ? CHAINS[session.chainId] ?? CHAINS[1] : null;

  const shortAddress = session
    ? `${session.address.slice(0, 6)}...${session.address.slice(-4)}`
    : '';

  // ── Connect ─────────────────────────────────────────────────────────────
  const connect = useCallback(async (walletType: WalletType) => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    setError(null);
    setStatus('connecting');

    try {
      // Simulate wallet extension detection (400ms)
      await new Promise((r) => setTimeout(r, 400));

      // Simulate approval prompt (800-1500ms)
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

      // Simulate occasional connection failure (10% chance)
      if (Math.random() < 0.1) {
        throw new Error('User rejected the connection request.');
      }

      // Simulate signing challenge (400ms)
      await new Promise((r) => setTimeout(r, 400));

      const mock = MOCK_WALLETS[walletType];
      const newSession: WalletSession = {
        address: mock.address,
        walletType,
        chainId: 1,
        connectedAt: Date.now(),
        ensName: mock.ensName,
      };

      setSession(newSession);
      setBalance(mock.balance);
      setStatus('connected');
      // Don't auto-close modal — let user click "Enter Dashboard"

    } catch (err: any) {
      setError(err.message || 'Connection failed. Please try again.');
      setStatus('error');
    } finally {
      connectingRef.current = false;
    }
  }, []);

  // ── Disconnect ──────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    setSession(null);
    setBalance('0');
    setStatus('disconnected');
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // ── Switch chain ────────────────────────────────────────────────────────
  const switchChain = useCallback(
    async (chainId: ChainId) => {
      if (!session) return;
      // Simulate chain switch
      await new Promise((r) => setTimeout(r, 600));
      const updated = { ...session, chainId };
      setSession(updated);
    },
    [session]
  );

  // ── Modal controls ──────────────────────────────────────────────────────
  const openConnectModal = useCallback(() => {
    setError(null);
    if (status === 'error') setStatus('disconnected');
    setIsModalOpen(true);
  }, [status]);

  const closeConnectModal = useCallback(() => {
    if (status === 'connecting') return; // Don't close while connecting
    setIsModalOpen(false);
    setError(null);
    if (status === 'error') setStatus('disconnected');
  }, [status]);

  return (
    <WalletContext.Provider
      value={{
        status,
        session,
        chain,
        balance,
        error,
        isConnected,
        shortAddress,
        connect,
        disconnect,
        switchChain,
        openConnectModal,
        closeConnectModal,
        isModalOpen,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
