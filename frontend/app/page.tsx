"use client";

import { motion } from "framer-motion";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ArrowRight, ShieldCheck, Zap, Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-sky-500/30">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur border-b border-white/5">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-violet-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
            <span className="text-xl font-bold tracking-wide">KinetiFi</span>
          </div>
          <button 
            onClick={() => connect({ connector: injected() })}
            className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-medium"
          >
            {!mounted ? "Loading..." : (isConnected ? "Wallet Connected" : "Connect Wallet")}
          </button>
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
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
              Zero-Trust Agentic DeFi.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-500">
                Powered by Mantle & Casper.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Deploy autonomous AI agents to manage your DeFi portfolio with cryptographic certainty. No middleman, no opaque execution.
            </p>
            
            <button
              onClick={handleLaunchApp}
              className="group relative px-8 py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-full font-bold text-lg transition-all glow-hover shadow-[0_0_15px_rgba(14,165,233,0.3)] flex items-center gap-2 mx-auto"
            >
              Launch App
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

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
