"use client";

import { useState } from "react";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Zap, AlertTriangle } from "lucide-react";

interface BundleStep {
  step: number;
  description: string;
  to: string;
  data: string;
  value: string;
  gas?: string;
  gasPrice?: string;
}

interface TransactionWidgetProps {
  bundle: BundleStep[];
  network: string;
  assetSymbol?: string;
  amount?: string;
  onConfirmed?: (hash: string) => void;
}

type StepStatus = "pending" | "waiting" | "confirming" | "done" | "error";

export default function TransactionWidget({
  bundle,
  network,
  assetSymbol,
  amount,
  onConfirmed,
}: TransactionWidgetProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(
    bundle.map(() => "pending")
  );
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | undefined>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);

  const { sendTransactionAsync } = useSendTransaction();

  const setStatus = (idx: number, status: StepStatus) => {
    setStepStatuses((prev) => {
      const next = [...prev];
      next[idx] = status;
      return next;
    });
  };

  const executeBundle = async () => {
    setIsExecuting(true);
    setErrorMsg(null);
    setAllDone(false);

    const isCasper = network.toLowerCase() === "casper";

    try {
      let lastHash: string | undefined;
      for (let i = 0; i < bundle.length; i++) {
        const tx = bundle[i];
        setStatus(i, "waiting");

        let hash: string;
        if (isCasper) {
          const win = window as any;
          if (!win.casperWalletProvider) {
            throw new Error("Casper Wallet extension not found. Please install the extension.");
          }
          const provider = win.casperWalletProvider();
          
          // Request wallet connection
          const isConnected = await provider.requestConnection();
          if (!isConnected) {
            throw new Error("Casper Wallet connection request was rejected.");
          }
          
          const publicKey = await provider.getActivePublicKey();
          if (!publicKey) {
            throw new Error("No active Casper Wallet public key found.");
          }
          
          // Request transaction signing
          const signResult = await provider.sign(
            typeof tx.data === "string" ? tx.data : JSON.stringify(tx.data),
            publicKey
          );
          if (signResult.cancelled) {
            throw new Error("Transaction signing was cancelled by user.");
          }
          
          // Broadcast signed deploy to Casper Network via our API gateway
          const submitResp = await fetch("http://localhost:8000/api/transact/submit-casper", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              signed_deploy: signResult,
              public_key: publicKey
            })
          });
          
          if (!submitResp.ok) {
            const errData = await submitResp.json().catch(() => ({}));
            throw new Error(errData.detail || "Failed to broadcast Casper transaction.");
          }
          
          const submitData = await submitResp.json();
          hash = submitData.deploy_hash;
        } else {
          // EVM Path (Mantle)
          const evmHash = await sendTransactionAsync({
            to: tx.to as `0x${string}`,
            data: tx.data as `0x${string}`,
            value: BigInt(tx.value || "0"),
          });
          hash = evmHash;
        }

        lastHash = hash;
        setCurrentTxHash(hash as any);
        setStatus(i, "confirming");

        if (isCasper) {
          await waitForCasperReceipt(hash);
        } else {
          await waitForReceipt(hash as `0x${string}`);
        }
        setStatus(i, "done");
      }
      setAllDone(true);
      if (lastHash) onConfirmed?.(lastHash);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setErrorMsg(msg);
      // Mark any still-pending steps as errored
      setStepStatuses((prev) =>
        prev.map((s) => (s === "waiting" || s === "confirming" ? "error" : s))
      );
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-2xl border border-sky-500/30 bg-gradient-to-br from-slate-900 to-slate-950 overflow-hidden shadow-[0_0_30px_rgba(14,165,233,0.08)]"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-sky-500/5">
        <Zap className="w-4 h-4 text-sky-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-white">Agent Strategy Generated</p>
          {assetSymbol && amount && (
            <p className="text-xs text-slate-400 mt-0.5">
              Supply {amount} {assetSymbol} → Aave V3 on{" "}
              <span className="text-sky-400 capitalize">{network}</span>
            </p>
          )}
        </div>
        <div className="ml-auto">
          <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            UNSIGNED
          </span>
        </div>
      </div>

      {/* Steps */}
      <ul className="px-5 py-4 space-y-2">
        {bundle.map((tx, idx) => (
          <li key={idx} className="flex items-center gap-3">
            <StepIndicator status={stepStatuses[idx]} step={tx.step} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200">{tx.description}</p>
              <p className="text-[10px] font-mono text-slate-500 truncate">
                → {tx.to}
              </p>
            </div>
            <StatusBadge status={stepStatuses[idx]} />
          </li>
        ))}
      </ul>

      {/* Error */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-5 mb-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-5 mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Strategy executed successfully on-chain!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Execute Button */}
      {!allDone && (
        <div className="px-5 pb-5">
          <button
            onClick={executeBundle}
            disabled={isExecuting}
            className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_20px_rgba(14,165,233,0.5)] flex items-center justify-center gap-2"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Executing Strategy...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Sign &amp; Execute
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-slate-600 mt-2">
            Zero-Trust · Unsigned · Non-custodial
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StepIndicator({ status, step }: { status: StepStatus; step: number }) {
  if (status === "done")
    return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
  if (status === "waiting" || status === "confirming")
    return <Loader2 className="w-5 h-5 text-sky-400 animate-spin shrink-0" />;
  if (status === "error")
    return <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />;
  return (
    <span className="w-5 h-5 rounded-full border border-white/20 text-[10px] flex items-center justify-center text-slate-500 shrink-0">
      {step}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: StepStatus;
}) {
  if (status === "done")
    return <span className="text-[10px] text-emerald-400 font-mono">DONE</span>;
  if (status === "confirming")
    return <span className="text-[10px] text-amber-400 font-mono animate-pulse">CONFIRMING</span>;
  if (status === "waiting")
    return <span className="text-[10px] text-sky-400 font-mono animate-pulse">SIGNING...</span>;
  if (status === "error")
    return <span className="text-[10px] text-rose-400 font-mono">FAILED</span>;
  return null;
}

/**
 * Polls the RPC until a transaction receipt arrives.
 * Wagmi's useWaitForTransactionReceipt is reactive; for sequential bundle
 * execution we need a Promise-based alternative.
 */
async function waitForReceipt(hash: `0x${string}`, timeoutMs = 120_000): Promise<void> {
  const { createPublicClient, http } = await import("viem");
  const { mantle } = await import("@/app/Providers");

  const client = createPublicClient({
    chain: mantle,
    transport: http("https://rpc.mantle.xyz"),
  });

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const receipt = await client.getTransactionReceipt({ hash });
      if (receipt) return;
    } catch {
      // Not yet mined
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Transaction ${hash} not confirmed within ${timeoutMs / 1000}s`);
}

async function waitForCasperReceipt(deployHash: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`https://api.testnet.cspr.cloud/deploys/${deployHash}`, {
        headers: { "Accept": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        const deployData = data.data || {};
        if (deployData.status === "executed" || deployData.status === "success") {
          return;
        }
      }
    } catch {
      // Ignore errors and retry
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
}
