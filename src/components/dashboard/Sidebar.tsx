import React from 'react';
import {
  LayoutDashboard,
  Vault,
  Layers,
  TrendingUp,
  History,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavItem = 'overview' | 'vault' | 'defi' | 'yield' | 'history';

interface SidebarProps {
  activeNav: NavItem;
  onNavChange: (nav: NavItem) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems: { id: NavItem; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Portfolio Overview', icon: LayoutDashboard },
  { id: 'vault', label: 'Asset Vault', icon: Vault },
  { id: 'defi', label: 'DeFi Positions', icon: Layers },
  { id: 'yield', label: 'Yield Strategies', icon: TrendingUp },
  { id: 'history', label: 'Transaction History', icon: History },
];

const Sidebar: React.FC<SidebarProps> = ({ activeNav, onNavChange, collapsed, onToggleCollapse }) => {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ease-in-out ${collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      style={{
        background: 'linear-gradient(180deg, #080C24 0%, #0A0E27 50%, #0D1130 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #00FFA3 100%)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#0A0E27" />
              <path d="M2 17L12 22L22 17" stroke="#0A0E27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="#0A0E27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
              Kineti<span className="text-[#00D4FF]">Fi</span>
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                }`}
              style={
                isActive
                  ? {
                    background: 'linear-gradient(90deg, rgba(0,212,255,0.12) 0%, rgba(0,255,163,0.06) 100%)',
                  }
                  : {}
              }
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                  style={{ background: 'linear-gradient(180deg, #00D4FF, #00FFA3)' }}
                />
              )}
              <Icon
                size={20}
                className={`flex-shrink-0 transition-colors ${isActive ? 'text-[#00D4FF]' : 'text-gray-500 group-hover:text-gray-300'
                  }`}
              />
              {!collapsed && (
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-white/5 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-all">
          <Settings size={20} className="flex-shrink-0 text-gray-500" />
          {!collapsed && <span className="text-sm font-medium">Settings</span>}
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-all">
          <HelpCircle size={20} className="flex-shrink-0 text-gray-500" />
          {!collapsed && <span className="text-sm font-medium">Help Center</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#141836] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#00D4FF]/30 transition-all z-50"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
};

export default Sidebar;
