'use client';

import { useEffect, useState } from 'react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { useSolanaWallet } from '@/contexts/WalletContext';
import { useCryptoPayment } from '@/hooks/useCryptoPayment';
import { useEthPayment } from '@/hooks/useEthPayment';
import { useEscrowStake } from '@/hooks/useEscrowStake';
import { GlossyCard, Button } from '@/components/components/ui';
import { Loader2, Check, AlertCircle, X, Wallet, Lock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Icons
const SolanaLogo = () => (
    <svg width="24" height="24" viewBox="0 0 397 311" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.8c-5.8 0-8.7-7-4.6-11.1l62.4-62.7zM332.1 76.9c-2.4 2.4-5.7 3.8-9.2 3.8H5.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7zM332.1 157.4c-2.4 2.4-5.7 3.8-9.2 3.8H5.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7z" fill="url(#sol_paint0_linear)" />
        <defs>
            <linearGradient id="sol_paint0_linear" x1="198.5" y1="0" x2="198.5" y2="311" gradientUnits="userSpaceOnUse">
                <stop stopColor="#9945FF" />
                <stop offset="1" stopColor="#14F195" />
            </linearGradient>
        </defs>
    </svg>
);

const EthLogo = () => (
    <svg width="24" height="24" viewBox="0 0 256 417" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
        <path fill="#343434" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" />
        <path fill="#8C8C8C" d="M127.962 0L0 212.32l127.962 75.639V154.158z" />
        <path fill="#3C3C3B" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" />
        <path fill="#8C8C8C" d="M127.962 416.905v-104.72L0 236.585z" />
        <path fill="#141414" d="M127.961 287.958l127.96-75.637-127.96-58.162z" />
        <path fill="#393939" d="M0 212.32l127.96 75.638v-133.8z" />
    </svg>
);

type ChainType = 'solana' | 'ethereum' | 'usdc-solana' | 'usdc-ethereum';
type TokenType = 'usdc' | 'sol' | 'eth';

interface CryptoPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    usdcAmount: number; // Primary payment method (1:1 with USD)
    solAmount?: number; // Optional alternative
    ethAmount?: number; // Optional alternative
    onSuccess: (data: { signature: string; chain: ChainType; token?: TokenType; isStake?: boolean }) => void;
    // Staking props (optional)
    stakeMode?: boolean;
    stakeAmount?: number; // Amount in ETH to stake
    eventId?: string;
    organizerWallet?: string;
    eventStartTime?: number; // Unix timestamp
}

export default function CryptoPaymentModal({
    isOpen,
    onClose,
    usdcAmount,
    solAmount = 0,
    ethAmount = 0,
    onSuccess,
    // Staking props
    stakeMode = false,
    stakeAmount = 0,
    eventId,
    organizerWallet,
    eventStartTime,
}: CryptoPaymentModalProps) {
    // Default to USDC on Ethereum (ETH-Sepolia) - uses MetaMask
    // If stakeMode is enabled, force ethereum chain
    const [chain, setChain] = useState<ChainType>(stakeMode ? 'ethereum' : 'usdc-ethereum');

    // Solana via custom hook
    const { solConnected, connectSolana } = useSolanaWallet();
    const solPayment = useCryptoPayment({
        onSuccess: (sig) => {
            // Determine if this was USDC on Solana or SOL payment
            const token = chain === 'usdc-solana' ? 'usdc' : 'sol';
            const chainType = chain === 'usdc-solana' ? 'usdc-solana' : 'solana';
            onSuccess({ signature: sig, chain: chainType, token });
        }
    });

    // Ethereum via wagmi (for ETH and USDC on Ethereum)
    const { isConnected: ethConnected, address: ethAddress } = useAccount();
    const { connect, connectors, isPending: isConnecting } = useConnect();
    const { disconnect } = useDisconnect();

    // Fetch exchange rates to convert USDC amount to ETH
    const { data: exchangeRates } = useQuery({
        queryKey: ['exchange-rates'],
        queryFn: async () => {
            const res = await fetch('/api/payments/exchange-rates');
            if (!res.ok) throw new Error('Failed to fetch exchange rates');
            const data = await res.json();
            return data.rates as { sol: number; eth: number; usdc: number };
        },
        staleTime: 5 * 60 * 1000,
        placeholderData: { sol: 200, eth: 3000, usdc: 1.0 },
        enabled: isOpen, // Only fetch when modal is open
    });

    const ethPayment = useEthPayment({
        onSuccess: (hash) => {
            // Determine if this was USDC on Ethereum or ETH payment
            const chainType = chain === 'usdc-ethereum' ? 'usdc-ethereum' : 'ethereum';
            const token = chain === 'usdc-ethereum' ? 'usdc' : 'eth';
            onSuccess({ signature: hash, chain: chainType, token });
        }
    });

    // Escrow staking hook (for events that require staking)
    const escrowStake = useEscrowStake({
        onSuccess: (hash) => {
            onSuccess({ signature: hash, chain: 'ethereum', token: 'eth', isStake: true });
        }
    });

    // Reset logic
    useEffect(() => {
        if (isOpen) {
            solPayment.reset();
            ethPayment.reset();
            escrowStake.reset();
        }
    }, [isOpen]);

    // Determine which payment handler to use based on chain and stakeMode
    const activePayment = stakeMode ? escrowStake : (chain === 'solana' || chain === 'usdc-solana') ? solPayment : ethPayment;
    const isConnected = (chain === 'solana' || chain === 'usdc-solana') ? solConnected : ethConnected;
    const displayAmount = stakeMode ? stakeAmount : (chain === 'usdc-ethereum' || chain === 'usdc-solana') ? usdcAmount : chain === 'solana' ? solAmount : ethAmount;
    const currency = stakeMode ? 'ETH (Stake)' : chain === 'usdc-ethereum' || chain === 'usdc-solana' ? 'USDC' : chain === 'solana' ? 'SOL' : 'ETH';

    const handlePay = () => {
        console.log('[CryptoPaymentModal] handlePay called', { chain, isConnected, stakeMode, stakeAmount });

        // Handle staking mode
        if (stakeMode && eventId && organizerWallet && eventStartTime) {
            console.log('[CryptoPaymentModal] Initiating stake:', { eventId, organizerWallet, stakeAmount });
            escrowStake.stake(eventId, organizerWallet, eventStartTime, stakeAmount.toString());
            return;
        }

        if (chain === 'usdc-ethereum') {
            // USDC on Ethereum (ETH-Sepolia) - uses MetaMask
            // Note: For MVP, we use ETH transfer and track as USDC
            // TODO: Implement ERC-20 USDC token transfer using writeContract
            // USDC Sepolia: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

            // Convert USDC amount (USD) to ETH using exchange rate
            // Example: $2 USDC / $3000 ETH = 0.000667 ETH
            if (!exchangeRates || !exchangeRates.eth) {
                alert('Exchange rates not available. Please try again.');
                return;
            }
            const ethAmountForUsdc = usdcAmount / exchangeRates.eth;
            console.log(`[CryptoPaymentModal] Converting $${usdcAmount} USDC to ${ethAmountForUsdc} ETH (rate: $${exchangeRates.eth}/ETH)`);
            ethPayment.pay(ethAmountForUsdc.toString());
        } else if (chain === 'usdc-solana') {
            // USDC on Solana - uses Phantom
            // Note: For MVP, we use SOL transfer infrastructure but track as USDC
            // TODO: Implement SPL token transfer for native USDC on Solana
            solPayment.pay(usdcAmount, 'Lumma Ticket - USDC');
        } else if (chain === 'solana') {
            solPayment.pay(solAmount, 'Lumma Ticket');
        } else {
            // ETH payment
            ethPayment.pay(ethAmount.toString());
        }
    };

    const handleConnect = () => {
        console.log('[CryptoPaymentModal] handleConnect called', { chain, connectors });
        if (chain === 'solana' || chain === 'usdc-solana') {
            // Solana network - opens Phantom
            connectSolana();
        } else {
            // Ethereum network (ETH or USDC on Ethereum) - MetaMask is now prioritized in wagmi config
            // Find MetaMask connector first (it's now first in the connectors array)
            let targetConnector = connectors.find(c =>
                c.id === 'metaMask' ||
                c.name?.toLowerCase().includes('metamask')
            );

            // Fallback to first injected connector if MetaMask not found
            if (!targetConnector) {
                targetConnector = connectors.find(c => c.type === 'injected') || connectors[0];
            }

            if (targetConnector) {
                console.log('[CryptoPaymentModal] Connecting with:', targetConnector.name || targetConnector.id);
                connect({ connector: targetConnector });
            } else {
                alert('No wallet detected. Please install MetaMask or another browser wallet.');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md"
                >
                    <GlossyCard className="relative overflow-hidden border border-white/10 shadow-2xl bg-[#000000]">

                        {/* Header Gradient */}
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${chain === 'usdc-ethereum' || chain === 'usdc-solana' ? 'from-blue-500 to-blue-600' : chain === 'solana' ? 'from-[#9945FF] to-[#14F195]' : 'from-blue-600 to-indigo-400'}`} />

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors p-1"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8 pb-4 flex flex-col items-center text-center space-y-6">

                            {/* Chain Selector Tabs */}
                            {activePayment.status === 'idle' && (
                                <div className="flex flex-col gap-2 w-full">
                                    {/* USDC Options */}
                                    <div className="flex bg-[#1C1C1E] p-1 rounded-xl border border-white/5 gap-1">
                                        <button
                                            onClick={() => setChain('usdc-ethereum')}
                                            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${chain === 'usdc-ethereum' ? 'bg-blue-500/20 text-blue-400 shadow-lg border border-blue-500/30' : 'text-text-muted hover:text-white'}`}
                                            title="USDC on Ethereum (ETH-Sepolia) - Uses MetaMask"
                                        >
                                            <div className="w-4 h-4 flex items-center justify-center bg-white rounded-full overflow-hidden p-[1px]"><EthLogo /></div>
                                            <span className="text-xs font-bold">USDC</span>
                                            <span className="text-[10px] text-text-muted">ETH</span>
                                        </button>
                                        <button
                                            onClick={() => setChain('usdc-solana')}
                                            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${chain === 'usdc-solana' ? 'bg-blue-500/20 text-blue-400 shadow-lg border border-blue-500/30' : 'text-text-muted hover:text-white'}`}
                                            title="USDC on Solana - Uses Phantom"
                                        >
                                            <SolanaLogo />
                                            <span className="text-xs font-bold">USDC</span>
                                            <span className="text-[10px] text-text-muted">SOL</span>
                                        </button>
                                    </div>
                                    {/* Alternative Options */}
                                    {(solAmount > 0 || ethAmount > 0) && (
                                        <div className="flex bg-[#1C1C1E] p-1 rounded-xl border border-white/5 gap-1">
                                            {solAmount > 0 && (
                                                <button
                                                    onClick={() => setChain('solana')}
                                                    className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${chain === 'solana' ? 'bg-[#9945FF]/20 text-[#14F195] shadow-lg' : 'text-text-muted hover:text-white'}`}
                                                >
                                                    <SolanaLogo /> SOL
                                                </button>
                                            )}
                                            {ethAmount > 0 && (
                                                <button
                                                    onClick={() => setChain('ethereum')}
                                                    className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${chain === 'ethereum' ? 'bg-blue-600/20 text-blue-400 shadow-lg' : 'text-text-muted hover:text-white'}`}
                                                >
                                                    <div className="w-5 h-5 flex items-center justify-center bg-white rounded-full overflow-hidden p-[2px]"><EthLogo /></div> ETH
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Icon / Status */}
                            <div className="relative pt-2">
                                <div className={`w-20 h-20 rounded-full bg-[#1C1C1E] flex items-center justify-center border border-white/10 relative z-10 ${activePayment.status === 'success' ? 'border-green-500' : ''}`}>
                                    {activePayment.status === 'success' ? (
                                        <Check className="w-10 h-10 text-green-500" />
                                    ) : activePayment.status === 'error' ? (
                                        <AlertCircle className="w-10 h-10 text-red-500" />
                                    ) : chain === 'usdc-ethereum' || chain === 'usdc-solana' ? (
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                            <span className="text-blue-400 font-bold text-sm">$</span>
                                        </div>
                                    ) : chain === 'solana' ? (
                                        <SolanaLogo />
                                    ) : (
                                        <div className="scale-150"><EthLogo /></div>
                                    )}
                                </div>
                                {/* Glow Effect */}
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-linear-to-br opacity-20 blur-3xl rounded-full transition-opacity ${chain === 'usdc-ethereum' || chain === 'usdc-solana' ? 'from-blue-500 to-blue-600' : chain === 'solana' ? 'from-[#9945FF] to-[#14F195]' : 'from-blue-600 to-indigo-400'} ${activePayment.status !== 'idle' && activePayment.status !== 'success' && activePayment.status !== 'error' ? 'opacity-40 animate-pulse' : ''}`} />
                            </div>

                            {/* Text Content */}
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-white">
                                    {activePayment.status === 'success' ? 'Payment Successful!' : `Pay with ${chain === 'usdc-ethereum' || chain === 'usdc-solana' ? 'USDC' : chain === 'solana' ? 'Solana' : 'Ethereum'}`}
                                </h3>
                                <p className="text-text-secondary text-sm">
                                    {activePayment.status === 'idle' && `Total: ${displayAmount} ${currency}`}
                                    {activePayment.status === 'connecting' && 'Connect your wallet...'}
                                    {activePayment.status === 'switching_network' && 'Switching to Sepolia network...'}
                                    {activePayment.status === 'creating_tx' && 'Preparing transaction...'}
                                    {activePayment.status === 'signing' && 'Please sign in your wallet...'}
                                    {activePayment.status === 'confirming' && 'Confirming on blockchain...'}
                                    {activePayment.status === 'mining' && 'Waiting for confirmation...'}
                                    {activePayment.status === 'success' && 'Your ticket has been issued.'}
                                    {activePayment.status === 'error' && (activePayment.error || 'Something went wrong')}
                                </p>
                            </div>

                            {/* Action Button */}
                            {activePayment.status === 'idle' || activePayment.status === 'error' ? (
                                <>
                                    {!isConnected ? (
                                        <Button
                                            size="lg"
                                            fullWidth
                                            className={`font-bold h-12 text-lg border-0 ${chain === 'usdc-ethereum' || chain === 'usdc-solana' ? 'bg-linear-to-r from-blue-500 to-blue-600 text-white' : chain === 'solana' ? 'bg-linear-to-r from-[#9945FF] to-[#14F195] text-black' : 'bg-linear-to-r from-blue-600 to-indigo-500 text-white'}`}
                                            onClick={handleConnect}
                                            disabled={isConnecting}
                                        >
                                            {isConnecting ? (
                                                <><Loader2 className="animate-spin mr-2" /> Connecting...</>
                                            ) : (
                                                <><Wallet className="mr-2" /> Connect Wallet</>
                                            )}
                                        </Button>
                                    ) : (
                                        <Button
                                            size="lg"
                                            fullWidth
                                            className={`font-bold h-12 text-lg border-0 ${chain === 'usdc-ethereum' || chain === 'usdc-solana' ? 'bg-linear-to-r from-blue-500 to-blue-600 text-white' : chain === 'solana' ? 'bg-linear-to-r from-[#9945FF] to-[#14F195] text-black' : 'bg-linear-to-r from-blue-600 to-indigo-500 text-white'}`}
                                            onClick={handlePay}
                                        >
                                            Confirm Payment
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <div className="h-12 flex items-center justify-center">
                                    {activePayment.status !== 'success' && (
                                        <div className={`flex items-center gap-2 font-medium ${chain === 'usdc-ethereum' || chain === 'usdc-solana' ? 'text-blue-400' : chain === 'solana' ? 'text-[#9945FF]' : 'text-blue-400'}`}>
                                            <Loader2 className="animate-spin" />
                                            Processing...
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Wallet Indicator */}
                            {isConnected && activePayment.status === 'idle' && (
                                <div className="flex items-center gap-2 text-xs text-text-muted bg-white/5 py-1 px-3 rounded-full">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    {chain === 'ethereum' && ethAddress ? (
                                        <span>Connected: {ethAddress.slice(0, 6)}...{ethAddress.slice(-4)}</span>
                                    ) : (
                                        <span>Wallet Connected</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </GlossyCard>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
