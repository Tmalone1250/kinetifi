
import React from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import { WalletProvider } from '@/contexts/WalletContext';

const Index: React.FC = () => {
  return (
    <WalletProvider>
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </WalletProvider>
  );
};

export default Index;
