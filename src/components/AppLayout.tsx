import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWallet } from '@/contexts/WalletContext';
import Sidebar, { type NavItem } from './dashboard/Sidebar';
import DashboardHeader from './dashboard/DashboardHeader';
import OverviewView from './dashboard/OverviewView';
import AssetVault from './dashboard/AssetVault';
import DeFiView from './dashboard/DeFiView';
import YieldStrategies from './dashboard/YieldStrategies';
import TransactionHistory from './dashboard/TransactionHistory';
import ConnectWalletModal from './wallet/ConnectWalletModal';
import LandingPage from './wallet/LandingPage';

const AppLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useAppContext();
  const isMobile = useIsMobile();
  const { isConnected } = useWallet();
  const [activeNav, setActiveNav] = useState<NavItem>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const effectiveCollapsed = isMobile ? true : sidebarCollapsed;

  const renderView = () => {
    switch (activeNav) {
      case 'overview':
        return <OverviewView onNavigate={setActiveNav} />;
      case 'vault':
        return <AssetVault />;
      case 'defi':
        return <DeFiView />;
      case 'yield':
        return <YieldStrategies />;
      case 'history':
        return <TransactionHistory />;
      default:
        return <OverviewView onNavigate={setActiveNav} />;
    }
  };

  const viewTitles: Record<NavItem, string> = {
    overview: 'Portfolio Overview',
    vault: 'Asset Vault',
    defi: 'DeFi Positions',
    yield: 'Yield Strategies',
    history: 'Transaction History',
  };

  return (
    <>
      {/* Connect modal — always mounted at top level so it persists across view transitions */}
      <ConnectWalletModal />

      {!isConnected ? (
        /* ── Landing page when wallet is not connected ──────────────── */
        <LandingPage />
      ) : (
        /* ── Dashboard when wallet is connected ────────────────────── */
        <div className="min-h-screen bg-[#0A0E27] grid-bg">
          <Sidebar
            activeNav={activeNav}
            onNavChange={setActiveNav}
            collapsed={effectiveCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          <DashboardHeader sidebarCollapsed={effectiveCollapsed} />

          <main
            className={`pt-16 min-h-screen transition-all duration-300 ${effectiveCollapsed ? 'pl-[72px]' : 'pl-[240px]'
              }`}
          >
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-xl font-bold text-white">{viewTitles[activeNav]}</h1>
                <p className="text-xs text-gray-500 mt-1">
                  {activeNav === 'overview' && 'Welcome back! Here\'s your portfolio at a glance.'}
                  {activeNav === 'vault' && 'View and manage all your crypto assets in one place.'}
                  {activeNav === 'defi' && 'Monitor and manage your decentralized finance positions.'}
                  {activeNav === 'yield' && 'Explore yield farming opportunities across DeFi protocols.'}
                  {activeNav === 'history' && 'Review all your on-chain transactions and activity.'}
                </p>
              </div>

              {renderView()}
            </div>

            <footer className="mt-8 px-6 py-4 border-t border-white/[0.04]">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #00D4FF 0%, #00FFA3 100%)',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#0A0E27" />
                      <path d="M2 17L12 22L22 17" stroke="#0A0E27" strokeWidth="2" strokeLinecap="round" />
                      <path d="M2 12L12 17L22 12" stroke="#0A0E27" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500">
                    KinetiFi Dashboard v0.1.0 · Built with care
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-gray-600">Block: 19,245,832</span>
                  <span className="text-[10px] text-gray-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] animate-pulse" />
                    Network: Healthy
                  </span>
                  <span className="text-[10px] text-gray-600">Last sync: Just now</span>
                </div>
              </div>
            </footer>
          </main>
        </div>
      )}
    </>
  );
};

export default AppLayout;
