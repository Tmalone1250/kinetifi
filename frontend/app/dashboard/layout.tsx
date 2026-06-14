"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Terminal, Cpu } from "lucide-react";
import clsx from "clsx";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: Home },
    { label: "Agent Command", href: "/dashboard/agent", icon: Terminal },
    { label: "Advanced Skills", href: "/dashboard/skills", icon: Cpu },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-slate-950/50 flex flex-col shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-sky-500 to-violet-500 shadow-[0_0_10px_rgba(14,165,233,0.3)]" />
            <span className="text-lg font-bold tracking-wide">KinetiFi</span>
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
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-[inset_0_0_15px_rgba(14,165,233,0.1)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                )}
              >
                <Icon className={clsx("w-5 h-5", isActive ? "text-sky-400" : "text-slate-500")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-white/5 text-xs text-slate-600 text-center font-mono">
          Identity ID: 1<br/>
          Status: ACTIVE
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#020617] relative">
        {/* Subtle background glow effect */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        {children}
      </main>
    </div>
  );
}
