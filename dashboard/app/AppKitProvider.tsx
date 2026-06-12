'use client';

import React, { ReactNode } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mantleSepoliaTestnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

// Set up the QueryClient for React Query
const queryClient = new QueryClient();

// Your Reown project ID (using the generic one from previous Providers.tsx)
const projectId = 'a29b6bc16db9c6e5f15d2a3f721516e8';

// Create the Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks: [mantleSepoliaTestnet as any], // Casting to any to ensure compatibility with AppKitNetwork
  projectId,
});

// Initialize the AppKit
createAppKit({
  adapters: [wagmiAdapter],
  networks: [mantleSepoliaTestnet as any],
  projectId,
  features: {
    analytics: true,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#10b981', // Matching the emerald theme from RainbowKit
  }
});

export function AppKitProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
