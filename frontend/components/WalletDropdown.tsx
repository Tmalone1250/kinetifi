"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Globe } from "lucide-react";
import { useAccount, useDisconnect } from "wagmi";

export function WalletDropdown() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <button className="flex items-center gap-2 bg-slate-800/50 border border-white/10 px-4 py-2 rounded-xl text-sm font-mono text-slate-500 transition-colors">
        Loading...
      </button>
    );
  }

  if (!isConnected || !address) {
    return (
      <button 
        onClick={() => router.push("/")}
        className="flex items-center gap-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-500/20 transition-colors cursor-pointer"
      >
        Connect Wallet
      </button>
    );
  }

  const handleDisconnect = () => {
    disconnect();
    router.push("/");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 border border-white/10 px-4 py-2 rounded-xl text-sm font-mono text-slate-300 transition-colors shadow-lg cursor-pointer"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        {`${address.slice(0, 6)}...${address.slice(-4)}`}
        <ChevronDown size={14} className="text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl py-1 z-50">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Globe size={14} className="text-sky-400" />
            Change Network
          </button>
          <div className="h-px bg-white/5 my-1" />
          <button
            onClick={(e) => {
              e.preventDefault();
              handleDisconnect();
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-white/5 transition-colors cursor-pointer relative z-50 pointer-events-auto"
          >
            <LogOut size={14} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
