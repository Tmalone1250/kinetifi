"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, fallback } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";
import { useState } from "react";

// Manually define Mantle with COMPLETE metadata as Perplexity suggested
export const mantle = defineChain({
  id: 5000,
  name: "Mantle",
  network: "mantle",
  nativeCurrency: {
    decimals: 18,
    name: "Mantle",
    symbol: "MNT", // Must be MNT
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.mantle.xyz"],
      webSocket: ["wss://rpc.mantle.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Mantle Explorer",
      url: "https://explorer.mantle.xyz",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 1,
    },
  },
});

const config = createConfig({
  chains: [mantle],
  connectors: [
    injected(),  // Reads from MetaMask directly
  ],
  transports: {
    [mantle.id]: fallback([
      http("https://rpc.mantle.xyz"),
      http("https://mantle.drpc.org"),
    ]),
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,  // 10 seconds
        retry: 2,
      },
    },
  }));

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
