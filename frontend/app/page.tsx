"use client";

import { motion } from "framer-motion";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ArrowRight, ShieldCheck, Zap, Activity, Code2, Link as LinkIcon, Video, Loader2, Terminal, Cpu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { WalletDropdown } from "../components/WalletDropdown";
import { useAgentProvenance } from "../hooks/useAgentProvenance";
import Link from "next/link";

export default function LandingPage() {
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { summary } = useAgentProvenance();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLaunchApp = () => {
    if (isConnected) {
      router.push("/dashboard");
    } else {
      connect({ connector: injected() });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-sky-500/30 overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur border-b border-white/5">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-violet-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
            <span className="text-xl font-bold tracking-wide">KinetiFi</span>
          </div>
          <div className="flex items-center gap-4">
            {!mounted ? (
              <div className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-slate-500">
                Loading...
              </div>
            ) : isConnected ? (
              <WalletDropdown />
            ) : (
              <button 
                onClick={() => connect({ connector: injected() })}
                className="px-5 py-2.5 rounded-full bg-sky-500 hover:bg-sky-400 text-white transition-colors text-sm font-bold shadow-[0_0_15px_rgba(14,165,233,0.3)] cursor-pointer"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 container mx-auto">
        <div className="max-w-4xl mx-auto text-center mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-slate-300 mb-8 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 to-violet-500/10" />
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
              <span className="relative z-10 flex items-center gap-2">
                Live Network: 
                {summary.isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <strong className="text-white">{summary.data?.total_decisions?.toLocaleString() ?? 0} Evaluations ({summary.data?.success_rate?.toFixed(2) ?? "0.00"}% Success)</strong>
                )}
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
              Zero-Trust Agentic DeFi.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-500">
                Powered by Mantle & Casper.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              An autonomous, intent-based Headless Wallet OS and Multi-Chain Portfolio Manager. Seamlessly bridge Mantle EVM operations with Solana-native protocols (via the Byreal CLI) anchored by ERC-8004 identity.
            </p>
            
            <button
              onClick={handleLaunchApp}
              className="group relative px-8 py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-full font-bold text-lg transition-all glow-hover shadow-[0_0_15px_rgba(14,165,233,0.3)] flex items-center gap-2 mx-auto cursor-pointer"
            >
              Launch App
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* Video Embed Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-24 max-w-4xl mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(139,92,246,0.15)] relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/20 to-violet-500/20 mix-blend-overlay pointer-events-none group-hover:opacity-0 transition-opacity duration-500" />
          <div className="aspect-video bg-slate-900 relative">
            <iframe 
              width="100%" 
              height="100%" 
              src="https://www.youtube.com/embed/kn6f4rTfNdM?autoplay=1&mute=1&loop=1&playlist=kn6f4rTfNdM" 
              title="KinetiFi Demo Video" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
              className="absolute inset-0"
            ></iframe>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <FeatureCard 
            icon={<Zap className="w-6 h-6 text-sky-400" />}
            title="Dual-Lane Routing"
            desc="Intelligently routes intent between high-speed EVM execution and specialized subprocess CLI tools."
            delay={0.1}
          />
          <FeatureCard 
            icon={<ShieldCheck className="w-6 h-6 text-violet-400" />}
            title="ERC-8004 Identity"
            desc="Your AI agent operates under a deterministic, verifiable on-chain identity for total accountability."
            delay={0.2}
          />
          <FeatureCard 
            icon={<Activity className="w-6 h-6 text-emerald-400" />}
            title="Zero-Trust Execution"
            desc="Every autonomous action requires cryptographically signed payloads ensuring strict constraint adherence."
            delay={0.3}
          />
        </div>

        {/* Quick Links Section */}
        <div className="mt-40 border-t border-white/5 pt-20 pb-10">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 text-sm font-mono text-slate-400">
            <Link href="https://github.com/tmalone1250/kinetifi" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
              <Code2 className="w-4 h-4" /> KinetiFi App Repo
            </Link>
            <Link href="https://github.com/tmalone1250/casper-mcp-py" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
              <Terminal className="w-4 h-4" /> Casper MCP Server
            </Link>
            <Link href="https://github.com/Tmalone1250/mantle-mcp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
              <Cpu className="w-4 h-4" /> Mantle MCP Server
            </Link>
            <Link href="https://youtu.be/kn6f4rTfNdM" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
              <Video className="w-4 h-4 text-sky-400" /> Demo Video
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
    >
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/5">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </motion.div>
  );
}
