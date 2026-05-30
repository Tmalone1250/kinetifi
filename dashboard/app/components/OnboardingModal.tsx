'use client';

import React, { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleOnboarding = async () => {
    setLoading(true);
    try {
      // Step 1: EIP-191 Signer Authorization
      setStep(1);
      const message = `Sign this message to authorize KinetiFi Agentic Wallet OS:\n- Agent Instance: KinetiFi-ERC8004-v1\n- Owner Signer: ${address}\n- Session Validity: 2592000 seconds\n- Nonce: ${Math.floor(Math.random() * 1000000)}`;
      await signMessageAsync({ message });

      // Step 2: Smart Account Factory Deployment Simulation
      setStep(2);
      await new Promise(resolve => setTimeout(resolve, 2500)); 

      // Step 3: ERC-8004 Oracle Registration Simulation
      setStep(3);
      await new Promise(resolve => setTimeout(resolve, 2000)); 

      // Completion Hook
      setStep(4);
      setTimeout(() => onComplete(), 1000);
    } catch (e) {
      console.error(e);
      setStep(0); 
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return <div className="text-gray-400">Loading KinetiFi Secure Enclave...</div>;
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-black/60 backdrop-blur-md border border-emerald-500/40 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.15)] max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Connect Owner Signer</h2>
        <p className="text-sm text-gray-400 mb-8">Authenticate with your EOA to begin the Smart Account transition sequence.</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-10 bg-black/60 backdrop-blur-md border border-emerald-500/40 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.15)] max-w-md w-full text-left">
      <h2 className="text-2xl font-bold text-white mb-8 text-center w-full">Initialize Autonomous Agent</h2>
      
      <div className="w-full space-y-6">
        <div className={`flex items-center space-x-4 transition-colors duration-500 ${step >= 1 ? 'text-emerald-400' : 'text-gray-600'}`}>
          {step === 1 && loading ? <Loader2 className="animate-spin w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          <span className="font-medium text-lg">1. Authorize EOA (EIP-191)</span>
        </div>
        
        <div className={`flex items-center space-x-4 transition-colors duration-500 ${step >= 2 ? 'text-emerald-400' : 'text-gray-600'}`}>
          {step === 2 && loading ? <Loader2 className="animate-spin w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          <span className="font-medium text-lg">2. Deploy Smart Account Proxy</span>
        </div>

        <div className={`flex items-center space-x-4 transition-colors duration-500 ${step >= 3 ? 'text-emerald-400' : 'text-gray-600'}`}>
          {step === 3 && loading ? <Loader2 className="animate-spin w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          <span className="font-medium text-lg">3. Mint ERC-8004 Identity</span>
        </div>
      </div>

      {step === 0 && (
        <button 
          onClick={handleOnboarding}
          className="mt-10 w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.6)] hover:shadow-[0_0_25px_rgba(16,185,129,0.9)] transition-all duration-300 tracking-wide"
        >
          EXECUTE TRANSITION
        </button>
      )}
    </div>
  );
}
