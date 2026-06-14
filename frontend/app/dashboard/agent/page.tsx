"use client";

import { motion } from "framer-motion";
import { Send, Paperclip, Mic, Sparkles, Plus, MessageSquare, Trash2, Edit2, X, Check, Octagon } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import clsx from "clsx";
import { useAccount } from "wagmi";
import TransactionWidget from "./TransactionWidget";

interface Message {
  role: "user" | "agent";
  content: string;
  action?: {
    kind: "sign_and_execute";
    network: string;
    bundle: BundleStep[];
    assetSymbol?: string;
    amount?: string;
  };
}

interface BundleStep {
  step: number;
  description: string;
  to: string;
  data: string;
  value: string;
  gas?: string;
  gasPrice?: string;
}

interface ParsedBundle {
  bundle: BundleStep[];
  network: string;
  workflow?: string;
}

interface Conversation {
  id: number;
  title: string;
}

interface TelemetryLine {
  ts?: string;
  timestamp?: string;
  level: string;
  component: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
}



export default function AgentCommandCenter() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  
  // Chat state
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "agent",
      content: "Hello! I am your KinetiFi Zero-Trust Agent. What DeFi intent would you like to execute today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [isEditingId, setIsEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Telemetry state
  const [telemetry, setTelemetry] = useState<TelemetryLine[]>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // Fetch all conversations
  const fetchConversations = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      console.warn("Could not fetch conversations");
    }
  };

  // Fetch messages when active conversation changes
  const fetchMessages = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:8000/api/conversations/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setMessages(data.map((msg: { role: "user" | "agent"; content: string; action?: any }) => ({ role: msg.role, content: msg.content, action: msg.action })));
        } else {
          setActiveConversationId(null); // Reset if empty
        }
      }
    } catch {
      console.warn("Could not fetch messages");
    }
  };

  // Hydration guard
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    fetchConversations();
  }, []);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMessages(activeConversationId);
    } else {
      setMessages([
        {
          role: "agent",
          content: "Hello! I am your KinetiFi Zero-Trust Agent. What DeFi intent would you like to execute today?",
        },
      ]);
    }
  }, [activeConversationId]);

  const createNewChat = () => {
    setActiveConversationId(null);
    setMessages([
      {
        role: "agent",
        content: "Hello! I am your KinetiFi Zero-Trust Agent. What DeFi intent would you like to execute today?",
      },
    ]);
  };

  const deleteConversation = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:8000/api/conversations/${id}`, { method: "DELETE" });
      if (activeConversationId === id) createNewChat();
      fetchConversations();
    } catch {
      console.warn("Could not delete conversation");
    }
  };

  const saveRename = async (id: number) => {
    try {
      await fetch(`http://localhost:8000/api/conversations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      setIsEditingId(null);
      fetchConversations();
    } catch {
      console.warn("Could not rename conversation");
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [telemetry]);

  // Poll telemetry every 2s
  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8000/api/telemetry");
      if (!res.ok) return;
      const data = await res.json();
      if (data.events && Array.isArray(data.events)) {
        setTelemetry(data.events.slice(-80));
      }
    } catch {
      // Fail silently
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  const handleSend = async (override?: string | any) => {
    const textToSend = typeof override === "string" ? override : prompt;
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    if (typeof override !== "string") setPrompt("");
    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = {
        intent: trimmed,
        wallet_address: mounted && isConnected ? address : null,
      };
      if (activeConversationId) {
        payload.conversation_id = activeConversationId;
      }

      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      
      // Update active conversation if it's a new one
      if (data.conversation_id && !activeConversationId) {
        setActiveConversationId(data.conversation_id);
        fetchConversations(); // Refresh list to get auto-named title
      }

      if (data.type === "action_required") {
        setMessages((prev) => [...prev, { role: "agent", content: data.response || data.content, action: data.action }]);
      } else {
        const agentMessage =
          data.response ||
          "I have securely routed and executed your intent on-chain. Check the telemetry logs for the strict execution trace.";
        setMessages((prev) => [...prev, { role: "agent", content: agentMessage }]);
      }
      await fetchTelemetry();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: `⚠️ ${msg}. Ensure the FastAPI server is running on port 8000.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTxConfirmed = async (hash: string) => {
    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "Transaction submitted",
          tx_hash: hash,
          conversation_id: activeConversationId,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "agent", content: data.response }]);
    } catch {
      console.warn("Failed to report tx_hash");
    }
  };

  const handleClearTelemetry = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/telemetry", { method: "DELETE" });
      if (res.ok) setTelemetry([]);
    } catch {
      // Fail silently
    }
  };

  const getLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "ERROR": return "text-rose-400";
      case "WARN":
      case "WARNING": return "text-amber-400";
      case "SUCCESS": return "text-emerald-400";
      default: return "text-sky-300";
    }
  };

  return (
    <div className="absolute inset-0 flex overflow-hidden">
      
      {/* ── Pane 1: Chat History Sidebar ── */}
      <div className="w-[240px] flex flex-col bg-slate-950 border-r border-white/5 z-20">
        <div className="p-4">
          <button
            onClick={createNewChat}
            className="flex items-center gap-2 w-full px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 rounded-xl transition-all font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-hide">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => {
                if (isEditingId !== conv.id) setActiveConversationId(conv.id);
              }}
              className={clsx(
                "group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all",
                activeConversationId === conv.id ? "bg-white/10" : "hover:bg-white/5"
              )}
            >
              {isEditingId === conv.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/20 rounded px-2 py-0.5 text-xs text-white outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(conv.id);
                      if (e.key === "Escape") setIsEditingId(null);
                    }}
                  />
                  <button onClick={(e) => { e.stopPropagation(); saveRename(conv.id); }} className="text-emerald-400 hover:text-emerald-300">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setIsEditingId(null); }} className="text-rose-400 hover:text-rose-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-xs text-slate-300 truncate">{conv.title}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTitle(conv.title);
                        setIsEditingId(conv.id);
                      }}
                      className="p-1 text-slate-500 hover:text-sky-400 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => deleteConversation(e, conv.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Pane 2: Chat Interface ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10 border-r border-white/5 bg-slate-950/40 backdrop-blur-md">
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-white/5 bg-slate-950/80">
          <div className="flex items-center gap-2 text-sky-400">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-semibold tracking-wide">KinetiFi Agent</h2>
          </div>
          <button
            onClick={() => handleSend("STOP")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-bold tracking-wide uppercase transition-all shadow-[0_0_10px_rgba(244,63,94,0.15)]"
          >
            <Octagon className="w-3.5 h-3.5" />
            Emergency Stop
          </button>
        </div>

        {/* Message History */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={clsx(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={clsx(
                  "max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.2)]"
                    : "bg-white/5 border border-white/10 text-slate-200"
                )}
              >
                {(() => {
                  if (msg.role === "agent" && msg.action) {
                    return (
                      <>
                        {msg.content && <p className="mb-2">{msg.content}</p>}
                        <TransactionWidget
                          bundle={msg.action.bundle}
                          network={msg.action.network ?? "mantle"}
                          onConfirmed={handleTxConfirmed}
                        />
                      </>
                    );
                  }
                  return msg.content;
                })()}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 pt-0">
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
            {["Swap 10 USDC to WETH", "Check my Identity", "Rebalance LP", "Find best APY for MNT"].map((chip) => (
              <button
                key={chip}
                onClick={() => setPrompt(chip)}
                className="shrink-0 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="relative flex items-end gap-2 bg-slate-900 border border-white/10 rounded-2xl p-2 focus-within:border-sky-500/50 focus-within:ring-1 focus-within:ring-sky-500/50 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask the agent to execute a Web3 intent..."
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none"
              rows={1}
            />
            <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors">
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={!prompt.trim() || isLoading}
              className="p-2 ml-1 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:bg-slate-700 text-white transition-all shadow-[0_0_10px_rgba(14,165,233,0.3)] disabled:shadow-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Pane 3: Live Telemetry Terminal ── */}
      <div className="w-[35%] flex flex-col min-h-0 overflow-hidden relative z-10 bg-black border-l border-white/10">
        <div className="h-10 flex items-center px-4 bg-[#1e1e1e] border-b border-white/5 justify-between">
          <div className="flex gap-2 items-center">
            <button 
              onClick={handleClearTelemetry}
              className="group flex items-center justify-center h-3 w-3 hover:w-12 bg-rose-500 rounded-full transition-all duration-300 overflow-hidden"
              title="Clear Telemetry"
            >
              <span className="text-[8px] font-bold text-black opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Clear
              </span>
            </button>
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <span className="text-xs text-slate-500 font-mono">Live Telemetry Terminal</span>
        </div>

        <div
          ref={terminalContainerRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-xs sm:text-sm text-emerald-400 bg-black"
        >
          {/* Boot header */}
          <div className="mb-4 text-sky-400">
            $ kinetifi-agent --connect --watch
            <br />
            [SYSTEM] Establishing secure enclave connection...
            <br />
            [SYSTEM] Zero-Trust routing online. Listening for telemetry...
          </div>

          {/* Live events */}
          {telemetry.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 opacity-50">
              <span className="w-2 h-4 bg-emerald-400 animate-pulse inline-block" />
              Waiting for next execution payload...
            </div>
          ) : (
            <div className="space-y-3">
              {telemetry.map((line, i) => {
                const time = (line.ts || line.timestamp || "")?.slice(11, 19) || "--:--:--";
                return (
                  <div key={i}>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-slate-600">{time}</span>
                      <span className={clsx("font-bold uppercase", getLevelColor(line.level))}>
                        [{line.level?.slice(0, 4)}]
                      </span>
                      <span className="text-violet-400">[{line.component}]</span>
                      <span className="text-slate-300">{line.description}</span>
                    </div>
                    {line.metadata && Object.keys(line.metadata).length > 0 && (
                      <pre className="ml-4 mt-1 text-slate-500 text-[10px] whitespace-pre-wrap break-all">
                        {JSON.stringify(line.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center gap-2 opacity-50 mt-2">
                <span className="w-2 h-4 bg-emerald-400 animate-pulse inline-block" />
                Waiting for next execution payload...
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
