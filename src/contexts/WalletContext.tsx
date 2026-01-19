/**
 * Solana Wallet Connection Context
 * Manages Solana (Phantom) wallet connection only.
 * Ethereum is handled by RainbowKit/wagmi.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Types
interface SolanaWalletState {
    solAddress: string | null;
    solConnected: boolean;
    solConnecting: boolean;
}

interface SolanaWalletContextType extends SolanaWalletState {
    connectSolana: () => Promise<void>;
    disconnectSolana: () => void;
    error: string | null;
}

const SolanaWalletContext = createContext<SolanaWalletContextType | undefined>(undefined);

// Check if Phantom is available
const getSolanaProvider = () => {
    if (typeof window !== 'undefined') {
        const phantom = (window as unknown as { phantom?: { solana?: { isPhantom: boolean; connect: () => Promise<{ publicKey: { toString: () => string } }>; disconnect: () => Promise<void> } } }).phantom;
        if (phantom?.solana?.isPhantom) {
            return phantom.solana;
        }
    }
    return null;
};

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<SolanaWalletState>({
        solAddress: null,
        solConnected: false,
        solConnecting: false,
    });
    const [error, setError] = useState<string | null>(null);

    // Check for existing Solana connection on mount
    useEffect(() => {
        const checkExistingConnection = async () => {
            const solProvider = getSolanaProvider();
            if (solProvider) {
                try {
                    const resp = await solProvider.connect();
                    if (resp?.publicKey) {
                        setState(prev => ({
                            ...prev,
                            solAddress: resp.publicKey.toString(),
                            solConnected: true,
                        }));
                    }
                } catch {
                    // Not connected, that's fine
                }
            }
        };

        checkExistingConnection();
    }, []);

    // Connect Solana (Phantom)
    const connectSolana = useCallback(async () => {
        const provider = getSolanaProvider();
        if (!provider) {
            setError('Phantom wallet not installed. Please install Phantom extension.');
            window.open('https://phantom.app/', '_blank');
            return;
        }

        setState(prev => ({ ...prev, solConnecting: true }));
        setError(null);

        try {
            const resp = await provider.connect();
            if (resp?.publicKey) {
                setState(prev => ({
                    ...prev,
                    solAddress: resp.publicKey.toString(),
                    solConnected: true,
                    solConnecting: false,
                }));
            }
        } catch (err: unknown) {
            const error = err as { code?: number; message?: string };
            console.error('Error connecting to Phantom:', err);
            if (error.code === 4001) {
                setError('Connection rejected by user');
            } else {
                setError('Failed to connect to Phantom');
            }
            setState(prev => ({ ...prev, solConnecting: false }));
        }
    }, []);

    const disconnectSolana = useCallback(async () => {
        const provider = getSolanaProvider();
        if (provider) {
            try {
                await provider.disconnect();
            } catch (err) {
                console.error('Error disconnecting Phantom:', err);
            }
        }
        setState(prev => ({
            ...prev,
            solAddress: null,
            solConnected: false,
        }));
    }, []);

    return (
        <SolanaWalletContext.Provider
            value={{
                ...state,
                connectSolana,
                disconnectSolana,
                error,
            }}
        >
            {children}
        </SolanaWalletContext.Provider>
    );
}

export function useSolanaWallet() {
    const context = useContext(SolanaWalletContext);
    if (context === undefined) {
        throw new Error('useSolanaWallet must be used within a SolanaWalletProvider');
    }
    return context;
}

// Legacy compatibility export (for existing code using useWallet)
// This now provides ONLY Solana functionality. ETH is via wagmi hooks.
export const WalletProvider = SolanaWalletProvider;
export const useWallet = useSolanaWallet;
