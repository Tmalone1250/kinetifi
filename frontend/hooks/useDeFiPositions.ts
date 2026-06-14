import { useEffect, useState, useMemo } from "react";
import { useAccount, useBlockNumber, useReadContracts, usePublicClient } from "wagmi";
import { formatUnits, parseAbiItem } from "viem";

const aaveATokenAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const erc1155Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const AAVE_AWMNT = "0x85d86061e94CE01D3DA0f9EFa289c86ff136125a" as const;
export const LB_PAIR_WMNT_USDT = "0x365722f12ceb2063286A268B03c654Df81B7C00F" as const;

// Parse the standard ERC-1155 transfer events
const transferSingleAbi = parseAbiItem('event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)');
const transferBatchAbi = parseAbiItem('event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)');

export function useDeFiPositions(vaultAddress?: `0x${string}`) {
  const { address } = useAccount();
  const owner = vaultAddress ?? address;
  const publicClient = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  // Maintain a state of discovered candidate Bin IDs
  const [candidateBinIds, setCandidateBinIds] = useState<bigint[]>([8377305n]);
  const [isScanning, setIsScanning] = useState(false);

  // 1. Scan Logs for ERC-1155 Transfers to the owner
  useEffect(() => {
    if (!owner || !publicClient) return;

    let isMounted = true;

    const scanLogs = async () => {
      setIsScanning(true);
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const startBlock = 96600000n; // Recent block to avoid massive scans
        const maxRange = 9999n;
        
        const discoveredIds = new Set<bigint>([8377305n]);

        for (let from = startBlock; from <= currentBlock; from += maxRange + 1n) {
          if (!isMounted) break;
          const to = (from + maxRange > currentBlock) ? currentBlock : from + maxRange;

          const singleLogs = await publicClient.getLogs({
            address: LB_PAIR_WMNT_USDT,
            event: transferSingleAbi,
            args: { to: owner },
            fromBlock: from,
            toBlock: to
          });

          const batchLogs = await publicClient.getLogs({
            address: LB_PAIR_WMNT_USDT,
            event: transferBatchAbi,
            args: { to: owner },
            fromBlock: from,
            toBlock: to
          });

          for (const log of singleLogs) {
            if (log.args.id) discoveredIds.add(log.args.id);
          }
          
          for (const log of batchLogs) {
            if (log.args.ids) {
              for (const id of log.args.ids) {
                discoveredIds.add(id);
              }
            }
          }
        }

        if (isMounted) {
          setCandidateBinIds(Array.from(discoveredIds));
        }
      } catch (e) {
        console.error("Failed to scan logs:", e);
      } finally {
        if (isMounted) setIsScanning(false);
      }
    };

    scanLogs();

    return () => { isMounted = false; };
  }, [owner, publicClient]);

  // 2. Build the dynamic contract read array
  const contracts = useMemo(() => {
    const calls: any[] = [
      {
        address: AAVE_AWMNT,
        abi: aaveATokenAbi,
        functionName: "balanceOf",
        args: [owner!],
      }
    ];

    if (owner) {
      for (const id of candidateBinIds) {
        calls.push({
          address: LB_PAIR_WMNT_USDT,
          abi: erc1155Abi,
          functionName: "balanceOf",
          args: [owner, id],
        });
      }
    }
    return calls;
  }, [owner, candidateBinIds]);

  // 3. Fetch Balances dynamically
  const { data, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: !!owner,
    }
  });

  // Refetch when block number changes to ensure real-time UI synchronization
  useEffect(() => {
    if (blockNumber) {
      refetch();
    }
  }, [blockNumber, refetch]);

  // 4. Process the raw data into formatted values
  const aaveRaw = data?.[0]?.result as bigint | undefined;
  const aaveFormatted = aaveRaw !== undefined ? Number(formatUnits(aaveRaw, 18)) : 0;

  let moeTotalFormatted = 0;
  let activeBinsCount = 0;

  // The 0th index is Aave, the rest are Merchant Moe Bins
  if (data && data.length > 1) {
    for (let i = 1; i < data.length; i++) {
      const balance = data[i]?.result as bigint | undefined;
      // Only count bins where the user has liquidity
      if (balance && balance > 0n) {
        activeBinsCount++;
        moeTotalFormatted += Number(formatUnits(balance, 18));
      }
    }
  }

  return {
    aaveBalance: aaveFormatted,
    moeBalance: moeTotalFormatted,
    activeBinsCount,
    rawAave: aaveRaw,
    refetch,
    isSyncing: !!blockNumber || isScanning // Pulse active if we have a block feed or are scanning
  };
}
