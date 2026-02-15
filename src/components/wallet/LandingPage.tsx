import React, { useEffect, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import {
  Layers,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  Wallet,
  ArrowRight,
  Globe,
  Lock,
  Eye,
  ChevronDown,
  Github,
  Twitter,
} from 'lucide-react';

// ── Animated counter ─────────────────────────────────────────────────────────

const AnimatedNumber: React.FC<{ target: number; prefix?: string; suffix?: string; duration?: number }> = ({
  target,
  prefix = '',
  suffix = '',
  duration = 2000,
}) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return (
    <span>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
};

// ── Feature card ─────────────────────────────────────────────────────────────

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: BarChart3,
    title: 'Portfolio Analytics',
    description: 'Real-time tracking across all chains with interactive charts and performance metrics.',
    color: '#00D4FF',
  },
  {
    icon: Layers,
    title: 'DeFi Management',
    description: 'Monitor liquidity pools, lending positions, and staking rewards in one unified view.',
    color: '#00FFA3',
  },
  {
    icon: TrendingUp,
    title: 'Yield Optimization',
    description: 'Discover and compare yield strategies across protocols with risk-adjusted APY analysis.',
    color: '#FFB800',
  },
  {
    icon: Shield,
    title: 'Security First',
    description: 'Non-custodial architecture. Your keys, your crypto. We never access your funds.',
    color: '#8B5CF6',
  },
  {
    icon: Zap,
    title: 'Instant Insights',
    description: 'Gas optimization, health factor alerts, and smart notifications keep you ahead.',
    color: '#FF6B6B',
  },
  {
    icon: Globe,
    title: 'Multi-Chain',
    description: 'Ethereum, Arbitrum, Optimism, Polygon, Base — all your positions in one dashboard.',
    color: '#3B99FC',
  },
];

// ── Protocol logos (simple SVG representations) ──────────────────────────────

const protocols = [
  { name: 'Uniswap', color: '#FF007A' },
  { name: 'Aave', color: '#B6509E' },
  { name: 'Curve', color: '#FFD700' },
  { name: 'Lido', color: '#00A3FF' },
  { name: 'GMX', color: '#2D42FC' },
  { name: 'Compound', color: '#00D395' },
  { name: 'Balancer', color: '#1E1E1E' },
  { name: 'MakerDAO', color: '#1AAB9B' },
];

// ── Stats ────────────────────────────────────────────────────────────────────

const stats = [
  { label: 'Total Value Tracked', value: 2400000000, prefix: '$', suffix: 'B+', display: '$2.4B+' },
  { label: 'Active Wallets', value: 48000, prefix: '', suffix: '+', display: '48K+' },
  { label: 'Protocols Supported', value: 120, prefix: '', suffix: '+', display: '120+' },
  { label: 'Chains Integrated', value: 12, prefix: '', suffix: '', display: '12' },
];

// ── Main Component ───────────────────────────────────────────────────────────

const LandingPage: React.FC = () => {
  const { openConnectModal } = useWallet();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0E27] text-white overflow-x-hidden">
      {/* ── Floating Header ─────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-3' : 'py-5'
          }`}
        style={{
          background: scrolled ? 'rgba(10, 14, 39, 0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #00FFA3 100%)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#0A0E27" />
                <path d="M2 17L12 22L22 17" stroke="#0A0E27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="#0A0E27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">
              Kineti<span className="text-[#00D4FF]">Fi</span>
            </span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#protocols" className="text-sm text-gray-400 hover:text-white transition-colors">Protocols</a>
            <a href="#security" className="text-sm text-gray-400 hover:text-white transition-colors">Security</a>
            <button className="text-sm text-gray-400 hover:text-white transition-colors">Docs</button>
          </nav>

          {/* CTA */}
          <button
            onClick={openConnectModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #00FFA3 100%)',
              color: '#0A0E27',
            }}
          >
            <Wallet size={16} />
            Connect Wallet
          </button>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, rgba(0,255,163,0.05) 40%, transparent 70%)',
          }}
        />
        {/* Floating orbs */}
        <div
          className="absolute top-40 left-[15%] w-64 h-64 rounded-full animate-glow"
          style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-60 right-[10%] w-48 h-48 rounded-full animate-glow"
          style={{ background: 'radial-gradient(circle, rgba(0,255,163,0.06) 0%, transparent 70%)', animationDelay: '1s' }}
        />

        <div className="relative max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 animate-float-up"
            style={{
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.15)',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] animate-pulse" />
            <span className="text-xs font-medium text-[#00D4FF]">Now supporting 12 chains</span>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-6 animate-float-up"
            style={{ animationDelay: '100ms' }}
          >
            Your DeFi Portfolio,
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #00D4FF 0%, #00FFA3 50%, #00D4FF 100%)' }}
            >
              One Command Center
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-float-up"
            style={{ animationDelay: '200ms' }}
          >
            Track, manage, and optimize your entire DeFi portfolio across chains and protocols.
            Real-time analytics, yield strategies, and smart alerts — all in one place.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-float-up"
            style={{ animationDelay: '300ms' }}
          >
            <button
              onClick={openConnectModal}
              className="flex items-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-[#00D4FF]/20"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #00FFA3 100%)',
                color: '#0A0E27',
              }}
            >
              <Wallet size={18} />
              Launch App
              <ArrowRight size={16} />
            </button>
            <button className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-medium text-gray-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all">
              <Eye size={18} />
              View Demo
            </button>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto animate-float-up"
            style={{ animationDelay: '400ms' }}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white font-mono">{stat.display}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="mt-16 flex justify-center animate-bounce">
            <ChevronDown size={20} className="text-gray-600" />
          </div>
        </div>
      </section>

      {/* ── Dashboard Preview ───────────────────────────────────────────── */}
      <section className="relative px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{
              background: 'linear-gradient(180deg, rgba(15,20,50,0.8) 0%, rgba(10,14,39,0.9) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 60px rgba(0,212,255,0.05)',
            }}
          >
            {/* Mock browser chrome */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-white/[0.04] text-xs text-gray-500 font-mono">
                  <Lock size={10} />
                  app.kineti.fi/dashboard
                </div>
              </div>
            </div>

            {/* Mock dashboard content */}
            <div className="p-6 grid grid-cols-12 gap-4">
              {/* Sidebar mock */}
              <div className="col-span-2 hidden lg:block space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-8 rounded-lg ${i === 1 ? 'bg-[#00D4FF]/10 border border-[#00D4FF]/20' : 'bg-white/[0.03]'}`}
                  />
                ))}
              </div>

              {/* Main content mock */}
              <div className="col-span-12 lg:col-span-10 space-y-4">
                {/* Metric cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Net Worth', value: '$142,500', color: '#00D4FF' },
                    { label: '24h Change', value: '+3.4%', color: '#00FFA3' },
                    { label: 'DeFi Positions', value: '8', color: '#8B5CF6' },
                    { label: 'Est. APY', value: '12.4%', color: '#FFB800' },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="rounded-xl p-4"
                      style={{
                        background: `${card.color}08`,
                        border: `1px solid ${card.color}15`,
                      }}
                    >
                      <p className="text-[10px] text-gray-500 uppercase">{card.label}</p>
                      <p className="text-lg font-bold text-white font-mono mt-1">{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* Chart mock */}
                <div className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-3 w-32 rounded bg-white/[0.06]" />
                    <div className="flex gap-1">
                      {['24H', '7D', '30D'].map((r) => (
                        <div key={r} className="h-5 w-8 rounded bg-white/[0.04] flex items-center justify-center text-[8px] text-gray-600">
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* SVG chart line */}
                  <svg viewBox="0 0 400 100" className="w-full h-24">
                    <defs>
                      <linearGradient id="landing-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,80 C30,75 60,60 100,55 C140,50 170,65 200,45 C230,25 260,35 300,20 C340,10 370,15 400,5"
                      fill="none"
                      stroke="url(#lineGradientLanding)"
                      strokeWidth="2"
                    />
                    <defs>
                      <linearGradient id="lineGradientLanding" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#00D4FF" />
                        <stop offset="100%" stopColor="#00FFA3" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,80 C30,75 60,60 100,55 C140,50 170,65 200,45 C230,25 260,35 300,20 C340,10 370,15 400,5 L400,100 L0,100 Z"
                      fill="url(#landing-grad)"
                    />
                  </svg>
                </div>

                {/* Table mock rows */}
                <div className="rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.04]">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.03]">
                      <div className="w-7 h-7 rounded-full bg-white/[0.06]" />
                      <div className="flex-1">
                        <div className="h-2.5 w-20 rounded bg-white/[0.08] mb-1.5" />
                        <div className="h-2 w-12 rounded bg-white/[0.04]" />
                      </div>
                      <div className="h-2.5 w-16 rounded bg-white/[0.06]" />
                      <div className="h-2.5 w-14 rounded bg-[#00FFA3]/15" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Overlay gradient */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, transparent 30%, rgba(10,14,39,0.95) 100%)',
              }}
            />

            {/* CTA overlay */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-auto">
              <button
                onClick={openConnectModal}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-[#00D4FF]/20 animate-pulse-neon"
                style={{
                  background: 'linear-gradient(135deg, #00D4FF 0%, #00FFA3 100%)',
                  color: '#0A0E27',
                }}
              >
                <Wallet size={16} />
                Connect Wallet to Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────────── */}
      <section id="features" className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to{' '}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #00D4FF, #00FFA3)' }}>
                master DeFi
              </span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Professional-grade tools for tracking, managing, and optimizing your decentralized finance portfolio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 group"
                  style={{
                    background: 'rgba(15, 20, 50, 0.4)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ background: `${feature.color}12`, border: `1px solid ${feature.color}25` }}
                  >
                    <Icon size={20} style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Protocols Section ───────────────────────────────────────────── */}
      <section id="protocols" className="px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Integrated with{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #00D4FF, #00FFA3)' }}>
              120+ protocols
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-12">
            From blue-chip DeFi to emerging protocols, we've got you covered.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {protocols.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-2.5 px-5 py-3 rounded-xl transition-all hover:-translate-y-0.5"
                style={{
                  background: `${p.color}08`,
                  border: `1px solid ${p.color}20`,
                }}
              >
                <div className="w-6 h-6 rounded-full" style={{ background: `${p.color}30` }} />
                <span className="text-sm font-medium text-gray-300">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security Section ────────────────────────────────────────────── */}
      <section id="security" className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(0,255,163,0.03) 100%)',
              border: '1px solid rgba(0,212,255,0.12)',
            }}
          >
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-30"
              style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.1), transparent)' }}
            />
            <Shield size={40} className="text-[#00D4FF] mx-auto mb-5" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Security is not optional</h2>
            <p className="text-gray-400 max-w-lg mx-auto mb-8 leading-relaxed">
              KinetiFi is fully non-custodial. We never have access to your private keys or funds.
              All wallet connections are read-only by default — you stay in complete control.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              {[
                { icon: Lock, label: 'Non-custodial' },
                { icon: Eye, label: 'Read-only access' },
                { icon: Shield, label: 'End-to-end encrypted' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-2 text-sm text-gray-300">
                    <Icon size={14} className="text-[#00FFA3]" />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to take control?
          </h2>
          <p className="text-gray-400 mb-8">
            Connect your wallet and start managing your DeFi portfolio like a pro.
          </p>
          <button
            onClick={openConnectModal}
            className="inline-flex items-center gap-2.5 px-10 py-4 rounded-xl text-base font-bold transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-[#00D4FF]/20"
            style={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #00FFA3 100%)',
              color: '#0A0E27',
            }}
          >
            <Wallet size={18} />
            Connect Wallet
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="px-6 py-10 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #00D4FF, #00FFA3)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#0A0E27" />
                    <path d="M2 17L12 22L22 17" stroke="#0A0E27" strokeWidth="2" strokeLinecap="round" />
                    <path d="M2 12L12 17L22 12" stroke="#0A0E27" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-sm font-bold">
                  Kineti<span className="text-[#00D4FF]">Fi</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Professional DeFi portfolio management for the modern investor.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Product</h4>
              <ul className="space-y-2">
                {['Dashboard', 'Analytics', 'Yield Finder', 'Alerts'].map((item) => (
                  <li key={item}>
                    <button className="text-xs text-gray-500 hover:text-white transition-colors">{item}</button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Resources</h4>
              <ul className="space-y-2">
                {['Documentation', 'API Reference', 'Status Page', 'Changelog'].map((item) => (
                  <li key={item}>
                    <button className="text-xs text-gray-500 hover:text-white transition-colors">{item}</button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Legal</h4>
              <ul className="space-y-2">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Disclaimer'].map((item) => (
                  <li key={item}>
                    <button className="text-xs text-gray-500 hover:text-white transition-colors">{item}</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/[0.04]">
            <p className="text-[11px] text-gray-600">
              &copy; 2026 KinetiFi. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] text-gray-500 hover:text-white transition-all">
                <Twitter size={14} />
              </button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] text-gray-500 hover:text-white transition-all">
                <Github size={14} />
              </button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] text-gray-500 hover:text-white transition-all">
                <Globe size={14} />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
