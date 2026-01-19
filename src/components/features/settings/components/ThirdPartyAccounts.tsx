/**
 * Third Party Accounts Component
 * Shows linked OAuth providers and wallet integrations with REAL functionality
 */

'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { GlossyCard } from '@/components/components/ui';
import { Plus, Check, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSolanaWallet } from '@/contexts/WalletContext';

// Provider icons
const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

const AppleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
);

const ZoomIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#2D8CFF">
        <path d="M4.585 6.836A2.25 2.25 0 0 0 2.25 9v6a2.25 2.25 0 0 0 2.335 2.25L15.75 17.25a2.25 2.25 0 0 0 2.25-2.25V9a2.25 2.25 0 0 0-2.25-2.25L4.585 6.836zm13.915 3v4.5l3.75 2.25V7.5l-3.75 2.336z" />
    </svg>
);

const SolanaIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
        <defs>
            <linearGradient id="solana-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00FFA3" />
                <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
        </defs>
        <path fill="url(#solana-gradient)" d="M4.5 18.75l1.5-1.5h13.5l-1.5 1.5H4.5zm0-5.25l1.5-1.5h13.5l-1.5 1.5H4.5zm15-3.75l-1.5 1.5H4.5l1.5-1.5H19.5z" />
    </svg>
);

const EthereumIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#627EEA">
        <path d="M12 1.5l-6.5 11 6.5 3.84 6.5-3.84L12 1.5zm-6.5 12.66L12 22.5l6.5-8.34L12 18l-6.5-3.84z" />
    </svg>
);

// Truncate address for display
function truncateAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ThirdPartyAccounts() {
    const { user, signInWithGoogle } = useAuth();

    // Ethereum via wagmi
    const { address: ethAddress, isConnected: ethConnected } = useAccount();
    const { connect, connectors, isPending: ethConnecting } = useConnect();
    const { disconnect } = useDisconnect();

    // Solana via custom context
    const {
        solAddress,
        solConnected,
        solConnecting,
        connectSolana,
        disconnectSolana,
        error: walletError,
    } = useSolanaWallet();

    const [connecting, setConnecting] = useState<string | null>(null);

    // Check which Firebase providers are linked
    const googleProvider = user?.providerData?.find(p => p.providerId === 'google.com');
    const appleProvider = user?.providerData?.find(p => p.providerId === 'apple.com');

    const handleGoogleConnect = async () => {
        if (googleProvider) return; // Already linked
        setConnecting('google');
        try {
            await signInWithGoogle();
        } catch (err) {
            console.error('Google connect error:', err);
        } finally {
            setConnecting(null);
        }
    };

    const handleAppleConnect = async () => {
        // Apple sign-in requires additional Firebase setup
        alert('Apple Sign-In requires additional Firebase configuration. Please set up Apple provider in Firebase Console.');
    };

    const handleZoomConnect = async () => {
        // Zoom OAuth requires backend setup
        alert('Zoom integration requires OAuth setup. This will be available soon.');
    };

    const handleEthereumConnect = async () => {
        if (ethConnected) {
            disconnect();
        } else {
            // Connect with first available connector (MetaMask, Rainbow, etc.)
            const connector = connectors[0];
            if (connector) {
                connect({ connector });
            }
        }
    };

    const handleSolanaConnect = async () => {
        if (solConnected) {
            disconnectSolana();
        } else {
            await connectSolana();
        }
    };

    const providers = [
        {
            id: 'google',
            name: 'Google',
            icon: <GoogleIcon />,
            isLinked: !!googleProvider,
            address: googleProvider?.email || undefined,
            isLoading: connecting === 'google',
            onClick: handleGoogleConnect,
        },
        {
            id: 'apple',
            name: 'Apple',
            icon: <AppleIcon />,
            isLinked: !!appleProvider,
            address: undefined,
            isLoading: connecting === 'apple',
            onClick: handleAppleConnect,
        },
        {
            id: 'zoom',
            name: 'Zoom',
            icon: <ZoomIcon />,
            isLinked: false,
            address: undefined,
            isLoading: connecting === 'zoom',
            onClick: handleZoomConnect,
        },
        {
            id: 'solana',
            name: 'Solana',
            icon: <SolanaIcon />,
            isLinked: solConnected,
            address: solAddress ? truncateAddress(solAddress) : undefined,
            isLoading: solConnecting,
            onClick: handleSolanaConnect,
        },
        {
            id: 'ethereum',
            name: 'Ethereum',
            icon: <EthereumIcon />,
            isLinked: ethConnected,
            address: ethAddress ? truncateAddress(ethAddress) : undefined,
            isLoading: ethConnecting,
            onClick: handleEthereumConnect,
        },
    ];

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-xl font-bold text-text-primary">Third Party Accounts</h3>
                <p className="text-sm text-text-secondary mt-1">
                    Link your accounts to sign in to Pulse and automate your workflows.
                </p>
            </div>

            {walletError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                    {walletError}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {providers.map((provider) => (
                    <GlossyCard
                        key={provider.id}
                        onClick={provider.onClick}
                        className={`p-4 flex items-center justify-between cursor-pointer transition-all hover:bg-white/10 ${provider.isLinked ? 'border-green-500/20' : ''
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {provider.icon}
                            <div>
                                <div className="font-medium text-text-primary">{provider.name}</div>
                                <div className="text-xs text-text-muted">
                                    {provider.isLinked
                                        ? (provider.address || 'Linked')
                                        : 'Not Linked'
                                    }
                                </div>
                            </div>
                        </div>
                        {provider.isLoading ? (
                            <Loader2 className="w-5 h-5 text-accent animate-spin" />
                        ) : provider.isLinked ? (
                            <Check className="w-5 h-5 text-green-500" />
                        ) : (
                            <Plus className="w-5 h-5 text-text-muted" />
                        )}
                    </GlossyCard>
                ))}
            </div>

            <p className="text-xs text-text-muted">
                <ExternalLink className="w-3 h-3 inline mr-1" />
                Click on a wallet to connect. Make sure you have MetaMask or Phantom extension installed.
            </p>
        </section>
    );
}
