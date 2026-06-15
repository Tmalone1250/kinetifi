"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Terminal, Cpu, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { WalletDropdown } from "../../components/WalletDropdown";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: Home },
    { label: "Agent Command", href: "/dashboard/agent", icon: Terminal },
    { label: "Advanced Skills", href: "/dashboard/skills", icon: Cpu },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={clsx(
          "relative border-r border-white/5 bg-slate-950/50 flex flex-col shrink-0 transition-all duration-300 z-50",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 bg-slate-800 border border-white/10 rounded-full p-1 text-slate-400 hover:text-white hover:bg-slate-700 z-10 transition-colors shadow-lg cursor-pointer"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={clsx("h-20 flex items-center border-b border-white/5", isCollapsed ? "justify-center" : "px-6")}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 shrink-0 rounded bg-gradient-to-tr from-sky-500 to-violet-500 shadow-[0_0_10px_rgba(14,165,233,0.3)]" />
            {!isCollapsed && <span className="text-lg font-bold tracking-wide">KinetiFi</span>}
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center rounded-lg text-sm font-medium transition-all overflow-hidden",
                  isCollapsed ? "justify-center py-3 px-0" : "gap-3 px-4 py-3",
                  isActive
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-[inset_0_0_15px_rgba(14,165,233,0.1)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={clsx("w-5 h-5 shrink-0", isActive ? "text-sky-400" : "text-slate-500")} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-white/5 text-xs text-slate-600 text-center font-mono overflow-hidden whitespace-nowrap min-h-[64px] flex flex-col justify-center">
          {!isCollapsed ? (
            <>
              Identity ID: 1<br/>
              Status: ACTIVE
            </>
          ) : (
            <div className="w-2 h-2 mx-auto rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Identity: 1 | Status: ACTIVE" />
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#020617] relative z-0">
        {/* Subtle background glow effect */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <header className="h-16 border-b border-white/5 flex items-center justify-end px-6 relative z-50 shrink-0 bg-slate-950/50 backdrop-blur-sm">
          <WalletDropdown />
        </header>

        <div className="flex-1 overflow-y-auto z-10 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
