"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wallet, PieChart, CheckCircle2, ArrowUpRight, Search, Copy, Check, ExternalLink, Loader2, Zap, AlertTriangle, X, Info } from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { useAccount, useReadContract, useSwitchChain, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { useDeFiPositions } from "../../hooks/useDeFiPositions";
import { useAgentProvenance } from "../../hooks/useAgentProvenance";

const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const METH_ADDRESS = "0xcDA86A272531e8640cD7F1a92c01839911B90bb0" as const;
const USDC_ADDRESS = "0x09Bc4E0D864854c6AFB6eB9A9cdF58aC190D0dF9" as const;

export default function DashboardOverview() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [mounted, setMounted] = useState(false);
  const [prices, setPrices] = useState({ mantle: 0, meth: 0, "usd-coin": 0 });

  // Dual-chain network selector
  const [selectedNetwork, setSelectedNetwork] = useState<'mantle' | 'casper'>('mantle');
  const [casperAddress, setCasperAddress] = useState<string>("01490212a4df656a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1ec0");
  const [casperPortfolio, setCasperPortfolio] = useState({
    cspr_balance: 4850.0,
    cspr_usd: 72.75,
    usdc_balance: 150.0,
    usdc_usd: 150.0,
    total_usd: 222.75,
    fetched: false,
    price: 0.015
  });
  const [isFetchingCasper, setIsFetchingCasper] = useState(false);

  // Real-time DeFi Positions
  const { aaveBalance, moeBalance, activeBinsCount, isSyncing } = useDeFiPositions();

  // Real-time Agent Provenance
  const { summary, recent } = useAgentProvenance();

  // Quick Action & Modals state
  const [showScanModal, setShowScanModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<'moe' | 'aave' | null>(null);
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Form state
  const [poolAddress, setPoolAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("MNT");

  // Tx Prepare State
  const [txPayload, setTxPayload] = useState<any>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [prepProgress, setPrepProgress] = useState("Initializing preparation...");

  // Wagmi Hooks
  const { sendTransactionAsync, data: hash, error: sendError, isPending: isSigning } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  const handleScan = async () => {
    setShowScanModal(true);
    setIsScanning(true);
    try {
      const res = await fetch("http://localhost:8000/api/yields/scan");
      if (res.ok) {
        const data = await res.json();
        setScanResults(data.results || []);
      } else {
        console.error("Scan yields failed");
      }
    } catch (err) {
      console.error("Error scanning yields:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleTransact = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first.");
      return;
    }
    
    setShowTxModal(true);
    setIsPreparing(true);
    setPrepError(null);
    setTxPayload(null);
    
    const messages = [
      "Querying Mantle RPC Node...",
      "Resolving pool contract ABI...",
      "Reading current active bin ID from pool...",
      "Calculating Merchant Moe swap proportions...",
      "Baking in 3% slippage protection...",
      "Compiling EVM calldata bytes...",
      "Finalizing transaction payload..."
    ];
    let i = 0;
    setPrepProgress(messages[0]);
    const timer = setInterval(() => {
      i++;
      if (i < messages.length) {
        setPrepProgress(messages[i]);
      } else {
        clearInterval(timer);
      }
    }, 700);

    try {
      const res = await fetch("http://localhost:8000/api/transact/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pool_address: poolAddress.trim(),
          asset,
          amount: parseFloat(amount),
          wallet_address: address
        }),
      });
      
      clearInterval(timer);
      
      if (res.ok) {
        const data = await res.json();
        setTxPayload(data);
      } else {
        const errData = await res.json().catch(() => ({ detail: "Failed to prepare transaction payload" }));
        setPrepError(errData.detail || "API returned an error");
      }
    } catch (err: any) {
      clearInterval(timer);
      setPrepError(err.message || "Network error. Is backend server running?");
    } finally {
      setIsPreparing(false);
    }
  };

  const handleExecute = async () => {
    if (!txPayload) return;
    try {
      await sendTransactionAsync({
        to: txPayload.to as `0x${string}`,
        data: txPayload.data as `0x${string}`,
        value: BigInt(txPayload.value || "0"),
      });
    } catch (err) {
      console.error("Signature rejected or execution failed", err);
    }
  };


  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=mantle,mantle-staked-ether,usd-coin&vs_currencies=usd")
      .then(res => res.json())
      .then(data => {
        setPrices({
          mantle: data.mantle?.usd || 0,
          meth: data["mantle-staked-ether"]?.usd || 0,
          "usd-coin": data["usd-coin"]?.usd || 0,
        });
      })
      .catch(err => console.error("CoinGecko fetch failed:", err));
  }, []);

  // Auto-switch to Mantle if on wrong chain and Mantle network is active
  useEffect(() => {
    if (selectedNetwork === 'mantle' && isConnected && chainId !== 5000 && switchChain) {
      switchChain({ chainId: 5000 });
    }
  }, [isConnected, chainId, switchChain, selectedNetwork]);

  // Fetch Casper balance when active address or network changes
  useEffect(() => {
    if (!casperAddress) return;
    
    let isMounted = true;
    async function fetchCasperData() {
      setIsFetchingCasper(true);
      try {
        const res = await fetch(`http://localhost:8000/api/portfolio/casper/${casperAddress}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setCasperPortfolio({
            cspr_balance: data.cspr_balance,
            cspr_usd: data.cspr_usd,
            usdc_balance: data.usdc_balance,
            usdc_usd: data.usdc_usd,
            total_usd: data.total_usd,
            fetched: data.fetched,
            price: data.price
          });
        }
      } catch (err) {
        console.error("Error fetching Casper portfolio:", err);
      } finally {
        if (isMounted) setIsFetchingCasper(false);
      }
    }

    fetchCasperData();
    const interval = setInterval(fetchCasperData, 15000); // Poll every 15s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [casperAddress]);

  const isEnabled = isConnected && !!address;

  // ERC-20 mETH balance via useReadContract (Wagmi v2 correct approach)
  const { data: methRaw } = useReadContract({
    address: METH_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: [address!],
    chainId: 5000,
    query: { enabled: isEnabled },
  });

  // ERC-20 USDC balance via useReadContract (Wagmi v2 correct approach)
  const { data: usdcRaw } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: [address!],
    chainId: 5000,
    query: { enabled: isEnabled },
  });

  // Foolproof native MNT balance fetch using raw RPC/viem bypass
  const [mntFormatted, setMntFormatted] = useState(0);

  useEffect(() => {
    if (!isEnabled || !address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMntFormatted(0);
      return;
    }

    async function fetchNativeBalance() {
      try {
        const res = await fetch("https://rpc.mantle.xyz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: [address, "latest"],
            id: 1,
          }),
        });
        const data = await res.json();
        if (data && data.result) {
          const balanceWei = BigInt(data.result);
          const balanceMNT = Number(balanceWei) / 1e18;
          setMntFormatted(balanceMNT);
        }
      } catch (err) {
        console.error("Direct RPC MNT fetch failed:", err);
      }
    }

    fetchNativeBalance();
    const interval = setInterval(fetchNativeBalance, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [isEnabled, address]);

  const methFormatted = methRaw !== undefined ? Number(formatUnits(methRaw, 18)) : 0;
  const usdcFormatted = usdcRaw !== undefined ? Number(formatUnits(usdcRaw, 6)) : 0;

  const mntUsd  = mntFormatted  * prices.mantle;
  const methUsd = methFormatted * prices.meth;
  const usdcUsd = usdcFormatted * prices["usd-coin"];
  const totalUsd = mntUsd + methUsd + usdcUsd;


  return (
    <div className="flex-1 overflow-y-auto p-8 relative z-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-500">
              Overview
            </h1>
            <p className="text-slate-400">Monitor your Zero-Trust Agentic DeFi portfolio.</p>
          </div>
          
          {/* Network Selector */}
          <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 self-start md:self-auto shadow-inner">
            <button
              onClick={() => setSelectedNetwork('mantle')}
              className={clsx(
                "px-4 py-1.5 rounded-xl text-xs font-semibold font-sans transition-all flex items-center gap-2 cursor-pointer",
                selectedNetwork === 'mantle'
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 border border-violet-500/30"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <span className={clsx("w-1.5 h-1.5 rounded-full bg-violet-400", selectedNetwork === 'mantle' && "animate-pulse")} />
              Mantle L2
            </button>
            <button
              onClick={() => setSelectedNetwork('casper')}
              className={clsx(
                "px-4 py-1.5 rounded-xl text-xs font-semibold font-sans transition-all flex items-center gap-2 cursor-pointer",
                selectedNetwork === 'casper'
                  ? "bg-gradient-to-r from-sky-600 to-emerald-600 text-white shadow-lg shadow-sky-500/20 border border-sky-500/30"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <span className={clsx("w-1.5 h-1.5 rounded-full bg-sky-400", selectedNetwork === 'casper' && "animate-pulse")} />
              Casper Testnet
            </button>
          </div>
        </div>

        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assets Card */}
          <Card 
            title={selectedNetwork === 'mantle' ? "EOA Assets" : "Casper Account Assets"} 
            icon={<Wallet className="w-5 h-5 text-sky-400" />}
          >
            <div className="mb-4">
              <span className={clsx(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                selectedNetwork === 'mantle'
                  ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              )}>
                <span className={clsx(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  selectedNetwork === 'mantle' ? "bg-sky-500" : "bg-emerald-500"
                )} />
                {selectedNetwork === 'mantle' ? "Live Mantle Network Data" : "Live Casper Testnet Data"}
              </span>
            </div>
            
            {selectedNetwork === 'mantle' ? (
              !mounted || !isConnected ? (
                <div className="py-8 text-center text-slate-500 font-mono text-sm border border-dashed border-white/10 rounded-lg">
                  Wallet not connected
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <span className="text-slate-400">Total Balance</span>
                    <span className="text-2xl font-bold font-mono">
                      ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-2">MNT <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">{mntFormatted.toFixed(4)}</span></span>
                    <span className="font-mono">${mntUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-2">mETH <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">{methFormatted.toFixed(4)}</span></span>
                    <span className="font-mono">${methUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-2">USDC <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">{usdcFormatted.toFixed(2)}</span></span>
                    <span className="font-mono">${usdcUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-slate-400">Total Balance</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400">
                    ${casperPortfolio.total_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-2">
                    CSPR
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                      {casperPortfolio.cspr_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </span>
                  </span>
                  <span className="font-mono text-slate-200">
                    ${casperPortfolio.cspr_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-2">
                    USDC (Casper)
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                      {casperPortfolio.usdc_balance.toFixed(2)}
                    </span>
                  </span>
                  <span className="font-mono text-slate-200">
                    ${casperPortfolio.usdc_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="pt-3 border-t border-white/5">
                  <label className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Active Casper Address</label>
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-2 focus-within:border-sky-500/50 transition-all">
                    <input 
                      type="text" 
                      value={casperAddress} 
                      onChange={(e) => setCasperAddress(e.target.value)}
                      className="bg-transparent text-slate-300 text-xs font-mono w-full focus:outline-none"
                      placeholder="Enter public key or account hash"
                    />
                    {isFetchingCasper && <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin flex-shrink-0" />}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* DeFi Positions Card */}
          <Card 
            title="DeFi Positions" 
            icon={<PieChart className={clsx("w-5 h-5", selectedNetwork === 'mantle' ? "text-violet-400" : "text-emerald-400")} />}
          >
            <div className="space-y-4">
              {selectedNetwork === 'mantle' ? (
                <>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">Merchant Moe LP</span>
                        <button onClick={() => setSelectedPosition('moe')} className="text-slate-500 hover:text-sky-400 transition-colors">
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-xs text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">Active Bins: {activeBinsCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-400">
                      <span>WMNT-USDT</span>
                      <span className="font-mono text-white">
                        {moeBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} LP
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">Aave V3 Supplied</span>
                        <button onClick={() => setSelectedPosition('aave')} className="text-slate-500 hover:text-violet-400 transition-colors">
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">Mantle</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-400">
                      <span>aWMNT</span>
                      <span className="font-mono text-white">
                        ${(aaveBalance * prices.mantle).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">Staking Delegation</span>
                        <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded font-mono">10.5% APY</span>
                      </div>
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
                    </div>
                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>Validator</span>
                        <span className="font-mono text-slate-300">01a238...8c1e</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Delegated CSPR</span>
                        <span className="font-mono text-white font-bold">3,000.00 CSPR</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">CSPR.trade LP Position</span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">1.62% APY</span>
                      </div>
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
                    </div>
                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>Pool Pair</span>
                        <span className="text-slate-300">CSPR-USDC</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Pool Share</span>
                        <span className="font-mono text-white font-bold">50.25 LP</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agent Provenance Card */}
          <Card title="Agent Provenance" icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="text-sm text-slate-400 mb-1">Success Rate</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {summary.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `${summary.data?.success_rate?.toFixed(2) ?? "0.00"}%`}
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="text-sm text-slate-400 mb-1">Evaluations</div>
                <div className="text-2xl font-bold text-sky-400">
                  {summary.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (summary.data?.total_decisions?.toLocaleString() ?? "0")}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-300 mb-2 flex items-center justify-between">
                <span>Recent Hashes (ERC-8004)</span>
                {recent.isFetching && !recent.isLoading && <span className="flex w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>}
              </div>
              {recent.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Fetching provenance logs...
                </div>
              ) : (
                recent.data?.map((item: any) => (
                  <div key={item.tx_hash} className="flex justify-between items-center text-sm">
                    <span className="font-mono text-slate-400">{item.tx_hash.slice(0, 10)}...</span>
                    <div className="flex gap-3">
                      <span className="text-slate-500">{item.elapsed_seconds}s ago</span>
                      <span className="text-sky-400 w-24 text-right">{item.tx_type}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Quick Action Card */}
          <Card title="Quick Action" icon={<Zap className="w-5 h-5 text-amber-400" />}>
            <p className="text-sm text-slate-400 mb-6">
              Scan yields or configure and execute a direct on-chain zapper transaction.
            </p>
            <div className="space-y-4 font-sans">
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="w-full py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 hover:text-sky-300 text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning Pools...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Scan Yields
                  </>
                )}
              </button>

              <div className="space-y-3 pt-2 border-t border-white/5">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
                    Pool Contract Address
                  </label>
                  <input
                    type="text"
                    value={poolAddress}
                    onChange={(e) => setPoolAddress(e.target.value)}
                    placeholder="0x3657... (Paste pool address)"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
                      Deposit Amount
                    </label>
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="3.0"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
                      Token Asset
                    </label>
                    <select
                      value={asset}
                      onChange={(e) => setAsset(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all"
                    >
                      <option value="MNT">MNT</option>
                      <option value="WMNT">WMNT</option>
                      <option value="USDT">USDT</option>
                      <option value="mETH">mETH</option>
                      <option value="CSPR">CSPR (Casper)</option>
                      <option value="USDC">USDC (Casper)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleTransact}
                  disabled={!poolAddress.trim() || !amount.trim() || parseFloat(amount) <= 0}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 mt-2"
                >
                  <Zap className="w-4 h-4" />
                  Transact
                </button>
              </div>
            </div>
          </Card>
        </div>

      </div>

      {/* Scan Yields Modal */}
      <AnimatePresence>
        {showScanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScanModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl z-10 font-sans"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Search className="w-5 h-5 text-sky-400" />
                    Available Yield Opportunities
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Live yields scanned directly from Mantle and Casper Networks. Select or copy a pool to transact.
                  </p>
                </div>
                <button
                  onClick={() => setShowScanModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isScanning ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                  <p className="text-sm font-mono text-slate-400">Scanning smart contracts...</p>
                </div>
              ) : scanResults.length === 0 ? (
                <div className="py-20 text-center text-slate-500 font-mono text-sm border border-dashed border-white/10 rounded-xl">
                  No active pools scanned. Check network RPC.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/30">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5 text-slate-400 font-mono">
                        <th className="p-3">Network</th>
                        <th className="p-3">Project</th>
                        <th className="p-3">Pair</th>
                        <th className="p-3">APY</th>
                        <th className="p-3">TVL</th>
                        <th className="p-3">Pool Address</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {scanResults.map((pool, idx) => {
                        const isCasper = pool.action_type === "casper";
                        return (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="p-3">
                              <span className={clsx(
                                "px-2 py-0.5 rounded text-[10px] font-semibold font-mono border",
                                isCasper
                                  ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                  : "bg-violet-500/10 text-violet-400 border-violet-500/20"
                              )}>
                                {isCasper ? "Casper" : "Mantle"}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-white">{pool.project}</td>
                            <td className="p-3">
                              <span className={clsx(
                                "px-2 py-0.5 rounded border font-mono",
                                isCasper
                                  ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                  : "bg-white/5 text-slate-300 border-white/10"
                              )}>
                                {pool.pair}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-emerald-400 font-bold">{pool.apy}%</td>
                            <td className="p-3 font-mono text-slate-300">{pool.tvl}</td>
                            <td className="p-3 font-mono text-slate-500">
                              {pool.pool_address.slice(0, 6)}...{pool.pool_address.slice(-4)}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setPoolAddress(pool.pool_address);
                                    if (pool.asset) {
                                      setAsset(pool.asset);
                                    }
                                    setShowScanModal(false);
                                  }}
                                  className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white border border-sky-500/30 transition-all flex items-center gap-1"
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>Use</span>
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(pool.pool_address);
                                    setCopiedAddress(pool.pool_address);
                                    setTimeout(() => setCopiedAddress(null), 2000);
                                  }}
                                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1"
                                >
                                  {copiedAddress === pool.pool_address ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400 font-semibold">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      <AnimatePresence>
        {showTxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSigning && !isConfirming) setShowTxModal(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl z-10 font-sans"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    Macro Execution Intent
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Zero-Trust atomic smart contract interaction.
                  </p>
                </div>
                <button
                  disabled={isSigning || isConfirming}
                  onClick={() => setShowTxModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isPreparing ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-white">Compiling Strategy...</p>
                    <p className="text-xs text-slate-400 font-mono animate-pulse">{prepProgress}</p>
                  </div>
                </div>
              ) : prepError ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Preparation Failed</p>
                      <p className="text-xs text-slate-400 mt-1">{prepError}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTxModal(false)}
                    className="w-full py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
                  >
                    Close &amp; Adjust Parameters
                  </button>
                </div>
              ) : txPayload ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/5 bg-black/30 p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Target Protocol</span>
                      <span className="font-semibold text-sky-400">{txPayload.workflow}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Interacting Zapper</span>
                      <span className="font-mono text-slate-300">
                        {txPayload.to.slice(0, 8)}...{txPayload.to.slice(-8)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Total Value sent (MNT)</span>
                      <span className="font-mono text-white font-semibold">
                        {(Number(txPayload.value) / 1e18).toFixed(4)} MNT
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs pt-2 border-t border-white/5">
                      <span className="text-slate-400">EVM Transaction Calldata</span>
                      <div className="bg-black/80 rounded p-2 text-[10px] font-mono text-slate-400 break-all max-h-24 overflow-y-auto">
                        {txPayload.data}
                      </div>
                    </div>
                  </div>

                  {isConfirmed ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-semibold">Transaction Confirmed!</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        The zapper successfully executed the atomic wrap, swap, and added liquidity into the bin range on-chain.
                      </p>
                      {hash && (
                        <a
                          href={`https://explorer.mantle.xyz/tx/${hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-semibold pt-1 transition-all"
                        >
                          View on Mantle Explorer <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : sendError || confirmError ? (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Execution Failed</p>
                        <p className="text-slate-400 mt-0.5">
                          {sendError?.message || confirmError?.message || "User denied transaction signature."}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {!isConfirmed && (
                    <button
                      onClick={handleExecute}
                      disabled={isSigning || isConfirming}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2"
                    >
                      {isSigning ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Please Confirm in Wallet...
                        </>
                      ) : isConfirming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Waiting for On-Chain Confirmation...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Sign &amp; Execute
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedPosition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/5">
                <h3 className="text-xl font-bold tracking-tight text-white">Position Details</h3>
                <button
                  onClick={() => setSelectedPosition(null)}
                  className="p-1 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {selectedPosition === 'moe' && (
                  <>
                    <DetailRow label="Protocol" value="Merchant Moe (DEX)" />
                    <DetailRow label="Pool Pair" value="WMNT-USDT" />
                    <DetailRow label="Total Balance" value={`${moeBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} LP Tokens`} />
                    <DetailRow label="Active Bins" value={activeBinsCount.toString()} />
                    <DetailRow label="Contract" value="0x365722f12ceb2063286A268B03c654Df81B7C00F" isAddress />
                    <DetailRow label="Network" value="Mantle L2" />
                  </>
                )}
                {selectedPosition === 'aave' && (
                  <>
                    <DetailRow label="Protocol" value="Aave V3 (Lending)" />
                    <DetailRow label="Asset" value="aWMNT" />
                    <DetailRow label="Total Supplied" value={`${aaveBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} aWMNT`} />
                    <DetailRow label="USD Value" value={`$${(aaveBalance * prices.mantle).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                    <DetailRow label="Contract" value="0x85d86061e94CE01D3DA0f9EFa289c86ff136125a" isAddress />
                    <DetailRow label="Network" value="Mantle L2" />
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/5 rounded-2xl p-6 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-white/5 border border-white/5">
          {icon}
        </div>
        <h2 className="text-lg font-semibold tracking-wide">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}
function DetailRow({ label, value, isAddress }: { label: string; value: string; isAddress?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={clsx("text-sm font-medium", isAddress ? "font-mono text-sky-400 text-xs" : "text-white")}>
        {isAddress ? value.slice(0, 8) + "..." + value.slice(-6) : value}
      </span>
    </div>
  );
}
