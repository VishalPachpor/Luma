/**
 * StakeDepositModal
 * 
 * DeFi-grade staking modal for event attendance deposits.
 * Supports USDT, USDC, SOL, ETH with live exchange rates.
 * Designed to feel like Jupiter/Uniswap — premium, seamless, animated.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useSolanaWallet } from '@/contexts/WalletContext';
import { AnimatePresence, motion } from 'framer-motion';
import {
    X, Shield, ShieldCheck, ArrowDown, Wallet,
    Check, AlertCircle, Loader2, RefreshCw, Clock, Ban, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import {
    useStakeDeposit,
    type StakeToken,
    type StakeNetwork,
    type StakeDepositStatus,
} from '@/hooks/useStakeDeposit';

// ============================================================================
// Token Logos (inline SVGs for crisp rendering)
// ============================================================================

const SolanaLogo = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 397 311" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.8c-5.8 0-8.7-7-4.6-11.1l62.4-62.7zM332.1 76.9c-2.4 2.4-5.7 3.8-9.2 3.8H5.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7zM332.1 157.4c-2.4 2.4-5.7 3.8-9.2 3.8H5.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7z" fill="url(#sol_grad)" />
        <defs>
            <linearGradient id="sol_grad" x1="198.5" y1="0" x2="198.5" y2="311" gradientUnits="userSpaceOnUse">
                <stop stopColor="#9945FF" />
                <stop offset="1" stopColor="#14F195" />
            </linearGradient>
        </defs>
    </svg>
);

const EthLogo = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 256 417" xmlns="http://www.w3.org/2000/svg">
        <path fill="#627EEA" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" />
        <path fill="#627EEA" d="M127.962 0L0 212.32l127.962 75.639V154.158z" opacity="0.6" />
        <path fill="#627EEA" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" />
        <path fill="#627EEA" d="M127.962 416.905v-104.72L0 236.585z" opacity="0.6" />
    </svg>
);

const USDTLogo = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 339 295" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M62.15 1.45l-61.89 130a2.52 2.52 0 00.54 2.94l167.15 160.17a2.55 2.55 0 003.53 0L338.63 134.4a2.52 2.52 0 00.54-2.94l-61.89-130A2.5 2.5 0 00274.56 0H64.87a2.5 2.5 0 00-2.72 1.45z" fill="#50AF95" />
        <path d="M191.19 144.8v-.07c-1.17.09-7.24.46-20.78.46-10.85 0-18.28-.33-20.91-.46v.08c-41.36-1.82-72.26-8.95-72.26-17.54s30.9-15.71 72.26-17.55v27.97c2.67.17 10.27.6 21.1.6 12.97 0 19.42-.51 20.59-.6v-27.96c41.29 1.83 72.11 8.94 72.11 17.54 0 8.6-30.82 15.71-72.11 17.53zm0-37.94v-25h57.51v-38.25H90.75v38.25h57.49v25c-46.83 2.08-81.91 11.27-81.91 22.26s35.08 20.18 81.91 22.26v79.71h20.76v-79.72c46.75-2.08 81.76-11.27 81.76-22.26s-35.01-20.17-81.76-22.25z" fill="#fff" />
    </svg>
);

const USDCLogo = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#2775CA" />
        <path d="M20.022 18.124c0-2.12-1.274-2.852-3.822-3.156-1.834-.24-2.2-.726-2.2-1.576 0-.85.55-1.394 1.65-1.394 1.008 0 1.558.364 1.834 1.274a.392.392 0 00.364.304h.85a.36.36 0 00.364-.364v-.06a2.814 2.814 0 00-2.548-2.366v-1.394a.36.36 0 00-.364-.364h-.79a.36.36 0 00-.364.364v1.334c-1.712.242-2.792 1.394-2.792 2.852 0 1.998 1.212 2.79 3.762 3.096 1.712.302 2.262.666 2.262 1.636 0 .97-.85 1.636-1.998 1.636-1.558 0-2.112-.666-2.296-1.576a.42.42 0 00-.364-.302h-.912a.36.36 0 00-.364.364v.06c.304 1.576 1.212 2.548 3.034 2.852v1.394a.36.36 0 00.364.364h.79a.36.36 0 00.364-.364v-1.394c1.712-.304 2.854-1.456 2.854-3.022z" fill="#fff" />
        <path d="M12.588 24.578C8.198 23 5.832 18.124 7.41 13.796c.85-2.366 2.67-4.186 5.036-5.036a.302.302 0 00.182-.364v-.79c0-.182-.12-.304-.302-.364-.06 0-.122 0-.182.06C7.472 9.082 5.046 14.65 6.828 19.322a10.068 10.068 0 005.828 5.828c.182.06.364-.06.424-.242 0-.06 0-.12 0-.182v-.79a.372.372 0 00-.242-.364l-.25.006zm7.072-17.174c-.182-.06-.364.06-.424.242 0 .06 0 .12 0 .182v.79c0 .182.122.304.242.364 4.39 1.576 6.756 6.454 5.178 10.782-.85 2.366-2.67 4.186-5.036 5.036a.302.302 0 00-.182.364v.79c0 .182.12.304.302.364.06 0 .122 0 .182-.06 4.672-1.78 7.098-7.348 5.316-12.02a10.068 10.068 0 00-5.828-5.828l.25-.006z" fill="#fff" />
    </svg>
);

// ============================================================================
// Token Configuration
// ============================================================================

interface TokenConfig {
    id: StakeToken;
    label: string;
    network: StakeNetwork;
    networkLabel: string;
    logo: React.ReactNode;
    color: string;
    bgGlow: string;
    gradientFrom: string;
    gradientTo: string;
}

const TOKENS: TokenConfig[] = [
    {
        id: 'usdt',
        label: 'USDT',
        network: 'ethereum',
        networkLabel: 'Ethereum',
        logo: <USDTLogo size={20} />,
        color: '#50AF95',
        bgGlow: 'rgba(80, 175, 149, 0.15)',
        gradientFrom: '#50AF95',
        gradientTo: '#3D9B7E',
    },
    {
        id: 'usdc',
        label: 'USDC',
        network: 'ethereum',
        networkLabel: 'Ethereum',
        logo: <USDCLogo size={20} />,
        color: '#2775CA',
        bgGlow: 'rgba(39, 117, 202, 0.15)',
        gradientFrom: '#2775CA',
        gradientTo: '#1A5FAF',
    },
    {
        id: 'sol',
        label: 'SOL',
        network: 'solana',
        networkLabel: 'Solana',
        logo: <SolanaLogo size={20} />,
        color: '#9945FF',
        bgGlow: 'rgba(153, 69, 255, 0.15)',
        gradientFrom: '#9945FF',
        gradientTo: '#14F195',
    },
    {
        id: 'eth',
        label: 'ETH',
        network: 'ethereum',
        networkLabel: 'Ethereum',
        logo: <EthLogo size={20} />,
        color: '#627EEA',
        bgGlow: 'rgba(98, 126, 234, 0.15)',
        gradientFrom: '#627EEA',
        gradientTo: '#4A67D4',
    },
];

// ============================================================================
// Props
// ============================================================================

interface StakeDepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    stakeAmount: number; // Can be USD or Native amount
    stakeCurrency?: string; // 'USD', 'ETH', 'SOL', 'USDC', 'USDT'
    eventId: string;
    organizerWallet?: string;
    eventStartTime?: number;
    onSuccess: (data: {
        signature: string;
        chain: 'solana' | 'ethereum' | 'usdc-solana' | 'usdc-ethereum';
        token?: 'usdc' | 'sol' | 'eth';
        isStake?: boolean;
        amountToken?: number; // Actual token amount paid (e.g., 0.000667 ETH)
        amountUsd?: number; // USD equivalent (e.g., $2)
    }) => void;
}

// ============================================================================
// Progress Steps Component
// ============================================================================

function StakeProgress({ status, currentStep, tokenColor }: { status: StakeDepositStatus; currentStep: number; tokenColor: string }) {
    const steps = ['Prepare', 'Connect', 'Sign', 'Confirm'];

    if (status === 'idle' || status === 'error') return null;

    return (
        <div className="flex items-center gap-1 w-full px-2">
            {steps.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                        <motion.div
                            className="h-1 w-full rounded-full overflow-hidden"
                            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                        >
                            <motion.div
                                className="h-full rounded-full"
                                initial={{ width: '0%' }}
                                animate={{
                                    width: i < currentStep ? '100%' : i === currentStep ? '60%' : '0%',
                                }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                style={{ backgroundColor: tokenColor }}
                            />
                        </motion.div>
                        <span className={`text-[10px] mt-1.5 transition-colors ${i <= currentStep ? 'text-white/60' : 'text-white/20'}`}>
                            {step}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function StakeDepositModal({
    isOpen,
    onClose,
    stakeAmount,
    stakeCurrency = 'USD', // Default to USD if not provided
    eventId,
    organizerWallet,
    eventStartTime,
    onSuccess,
}: StakeDepositModalProps) {
    // Determine if we are in "Native Mode" (Fixed Token) or "USD Mode" (Any Token)
    const isNativeMode = stakeCurrency !== 'USD';
    const requiredTokenId = isNativeMode ? stakeCurrency.toLowerCase() as StakeToken : null;

    const [selectedToken, setSelectedToken] = useState<StakeToken>('usdt');

    // Wallet states
    const { isConnected: ethConnected, address: ethAddress } = useAccount();
    const { connect, connectors, isPending: isEthConnecting } = useConnect();
    const { solConnected, solAddress, connectSolana } = useSolanaWallet();

    // Exchange rates
    const { data: exchangeRates, isLoading: ratesLoading } = useQuery({
        queryKey: ['exchange-rates'],
        queryFn: async () => {
            const res = await fetch('/api/payments/exchange-rates');
            if (!res.ok) throw new Error('Failed to fetch rates');
            const data = await res.json();
            return data.rates as { sol: number; eth: number; usdc: number };
        },
        staleTime: 60 * 1000, // 1 minute
        refetchInterval: 60 * 1000,
        placeholderData: { sol: 200, eth: 3000, usdc: 1.0 },
        enabled: isOpen,
    });

    // Stake deposit hook
    const stakeDeposit = useStakeDeposit({
        onSuccess: (data) => {
            // Map to the onSuccess format expected by EventRSVP
            const chainMap: Record<string, 'solana' | 'ethereum' | 'usdc-solana' | 'usdc-ethereum'> = {
                'sol-solana': 'solana',
                'usdc-solana': 'usdc-solana',
                'usdt-ethereum': 'usdc-ethereum', // Treat USDT same as USDC for chain mapping
                'usdc-ethereum': 'usdc-ethereum',
                'eth-ethereum': 'ethereum',
            };
            const chain = chainMap[`${data.token}-${data.network}`] || 'ethereum';
            const token = data.token === 'usdt' ? 'usdc' : data.token as 'usdc' | 'sol' | 'eth';
            onSuccess({
                signature: data.txHash,
                chain,
                token,
                isStake: true,
                amountToken: data.amountToken, // Pass the actual token amount
                amountUsd: data.amountUsd // Pass the USD value
            });
        },
    });

    // Reset on open and handle strict token enforcement
    useEffect(() => {
        if (isOpen) {
            stakeDeposit.reset();
            if (requiredTokenId) {
                setSelectedToken(requiredTokenId);
            } else {
                setSelectedToken('usdt');
            }
        }
    }, [isOpen, requiredTokenId]);

    // Token config
    const activeToken = TOKENS.find(t => t.id === selectedToken) || TOKENS[0];
    const network = activeToken.network;
    const isConnected = network === 'solana' ? solConnected : ethConnected;
    const walletAddress = network === 'solana' ? solAddress : ethAddress;

    // Calculate USD Value and Token Amount based on mode
    const { tokenAmount, usdValue } = useMemo(() => {
        // If exchange rates aren't ready, return safe defaults
        if (!exchangeRates) return { tokenAmount: 0, usdValue: 0 };

        if (isNativeMode && requiredTokenId) {
            // NATIVE MODE: User must pay exactly `stakeAmount` of `requiredTokenId`
            // USD Value is calculated for display: Amount * Price
            let price = 1; // Default for stables
            if (requiredTokenId === 'eth') price = exchangeRates.eth;
            if (requiredTokenId === 'sol') price = exchangeRates.sol;

            return {
                tokenAmount: stakeAmount,
                usdValue: stakeAmount * price
            };
        } else {
            // USD MODE: User pays `stakeAmount` worth of ANY token
            // Token Amount is calculated: USD Amount / Price
            const usd = stakeAmount;
            let amount = 0;
            switch (selectedToken) {
                case 'usdt':
                case 'usdc':
                    amount = usd;
                    break;
                case 'eth':
                    amount = Number((usd / exchangeRates.eth).toFixed(6));
                    break;
                case 'sol':
                    amount = Number((usd / exchangeRates.sol).toFixed(4));
                    break;
            }
            return {
                tokenAmount: amount,
                usdValue: usd
            };
        }
    }, [selectedToken, stakeAmount, exchangeRates, isNativeMode, requiredTokenId]);

    // Format display strings
    const displayAmount = usdValue < 0.01 ? usdValue.toString() : usdValue.toFixed(2);
    const displayTokenAmount = (() => {
        if (selectedToken === 'usdt' || selectedToken === 'usdc') {
            return `${tokenAmount.toFixed(2)} ${activeToken.label}`;
        }
        if (selectedToken === 'eth') {
            return `${tokenAmount.toFixed(6)} ${activeToken.label}`;
        }
        return `${tokenAmount.toFixed(4)} ${activeToken.label}`;
    })();

    const handleConnect = () => {
        if (network === 'solana') {
            connectSolana();
        } else {
            let targetConnector = connectors.find(c =>
                c.id === 'metaMask' || c.name?.toLowerCase().includes('metamask')
            );
            if (!targetConnector) {
                targetConnector = connectors.find(c => c.type === 'injected') || connectors[0];
            }
            if (targetConnector) {
                connect({ connector: targetConnector });
            } else {
                toast.error('No wallet detected. Please install MetaMask.');
            }
        }
    };

    const handleDeposit = () => {
        stakeDeposit.deposit({
            token: selectedToken,
            network,
            amountUsd: usdValue,
            amountToken: tokenAmount,
            eventId,
            recipient: organizerWallet,
        });
    };

    if (!isOpen) return null;

    const isProcessing = stakeDeposit.status !== 'idle' && stakeDeposit.status !== 'error' && stakeDeposit.status !== 'success';
    const isSuccess = stakeDeposit.status === 'success';
    const isError = stakeDeposit.status === 'error';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/70 backdrop-blur-md"
                    onClick={!isProcessing ? onClose : undefined}
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="relative w-full max-w-[420px] z-10"
                >
                    <div
                        className="relative overflow-hidden rounded-2xl border border-white/8 shadow-2xl"
                        style={{ background: 'linear-gradient(180deg, rgba(17,17,20,0.98) 0%, rgba(10,10,14,0.99) 100%)' }}
                    >
                        {/* ── Top Gradient Accent ── */}
                        <motion.div
                            className="absolute top-0 left-0 right-0 h-[2px]"
                            style={{
                                background: `linear-gradient(90deg, transparent, ${activeToken.gradientFrom}, ${activeToken.gradientTo}, transparent)`,
                            }}
                            layoutId="topGradient"
                        />

                        {/* ── Background Glow ── */}
                        <div
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[120px] pointer-events-none opacity-30 transition-all duration-700"
                            style={{ backgroundColor: activeToken.color }}
                        />

                        {/* ── Close Button ── */}
                        <button
                            onClick={!isProcessing ? onClose : undefined}
                            className="absolute top-4 right-4 z-20 text-white/30 hover:text-white/70 transition-colors p-1 rounded-lg hover:bg-white/5"
                        >
                            <X size={18} />
                        </button>

                        <div className="relative z-10 p-6 flex flex-col gap-5">

                            {/* ── Header: Shield + Title ── */}
                            <div className="flex flex-col items-center text-center gap-3 pt-1">
                                <motion.div
                                    className="relative"
                                    animate={isSuccess ? { scale: [1, 1.15, 1] } : {}}
                                    transition={{ duration: 0.5 }}
                                >
                                    {/* Shield icon with glow */}
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
                                        style={{
                                            background: `linear-gradient(135deg, ${activeToken.bgGlow}, transparent)`,
                                            border: `1px solid ${activeToken.color}25`,
                                        }}
                                    >
                                        {isSuccess ? (
                                            <motion.div
                                                initial={{ scale: 0, rotate: -45 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ type: 'spring', damping: 12 }}
                                            >
                                                <ShieldCheck size={28} style={{ color: activeToken.color }} />
                                            </motion.div>
                                        ) : isError ? (
                                            <AlertCircle size={28} className="text-red-400" />
                                        ) : isProcessing ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                                            >
                                                <Shield size={28} style={{ color: activeToken.color }} />
                                            </motion.div>
                                        ) : (
                                            <Shield size={28} style={{ color: activeToken.color }} />
                                        )}
                                    </div>
                                    {/* Pulse ring */}
                                    {isProcessing && (
                                        <motion.div
                                            className="absolute inset-0 rounded-2xl"
                                            style={{ border: `1px solid ${activeToken.color}` }}
                                            animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
                                            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                                        />
                                    )}
                                </motion.div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white tracking-tight">
                                        {isSuccess ? 'Deposit Secured!' : isError ? 'Deposit Failed' : 'Stake to Attend'}
                                    </h3>
                                    <p className="text-xs text-white/40 mt-0.5">
                                        {isSuccess
                                            ? 'Returned to you on check-in'
                                            : isError
                                                ? stakeDeposit.error
                                                : 'Refundable attendance deposit'}
                                    </p>
                                </div>
                            </div>

                            {/* ── Progress Steps ── */}
                            {isProcessing && (
                                <StakeProgress
                                    status={stakeDeposit.status}
                                    currentStep={stakeDeposit.currentStep}
                                    tokenColor={activeToken.color}
                                />
                            )}

                            {/* ── Amount Display Card ── */}
                            {!isSuccess && (
                                <div
                                    className="rounded-xl p-4 relative overflow-hidden"
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] text-white/30 uppercase tracking-widest font-medium">You deposit</span>
                                        {!ratesLoading && exchangeRates && (selectedToken === 'eth' || selectedToken === 'sol') && (
                                            <div className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                <span className="text-[10px] text-emerald-400/70">Live rate</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Amount */}
                                    <div className="flex items-baseline gap-2 mt-2">
                                        <span className="text-3xl font-bold text-white tracking-tight">
                                            ${displayAmount}
                                        </span>
                                        <span className="text-sm text-white/30">USD</span>
                                    </div>

                                    {/* Equivalent */}
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <span className="text-xs text-white/40">
                                            {isNativeMode ? 'Exactly' : '≈'}
                                        </span>
                                        <span className="text-sm text-white/60 font-medium">
                                            {displayTokenAmount}
                                        </span>
                                    </div>

                                    {/* Decorative line */}
                                    <div className="absolute bottom-0 left-4 right-4 h-px" style={{ background: `linear-gradient(90deg, transparent, ${activeToken.color}20, transparent)` }} />
                                </div>
                            )}

                            {/* ── Success Amount ── */}
                            {isSuccess && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-xl p-4 text-center"
                                    style={{
                                        background: `${activeToken.color}08`,
                                        border: `1px solid ${activeToken.color}20`,
                                    }}
                                >
                                    <p className="text-2xl font-bold text-white">${displayAmount}</p>
                                    <p className="text-xs text-white/40 mt-1">{displayTokenAmount} deposited</p>
                                    {stakeDeposit.txHash && (
                                        <p className="text-[10px] text-white/20 mt-2 font-mono">
                                            tx: {stakeDeposit.txHash.slice(0, 8)}...{stakeDeposit.txHash.slice(-6)}
                                        </p>
                                    )}
                                </motion.div>
                            )}

                            {/* ── Token Selector ── */}
                            {!isProcessing && !isSuccess && (
                                <div>
                                    <span className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-2 block">
                                        Pay with
                                    </span>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {TOKENS.map((token) => {
                                            const isActive = selectedToken === token.id;
                                            const isLocked = requiredTokenId && requiredTokenId !== token.id;

                                            return (
                                                <motion.button
                                                    key={token.id}
                                                    onClick={() => !isLocked && setSelectedToken(token.id)}
                                                    whileHover={!isLocked ? { scale: 1.03 } : {}}
                                                    whileTap={!isLocked ? { scale: 0.97 } : {}}
                                                    className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 ${isLocked ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
                                                    style={{
                                                        background: isActive ? `${token.color}12` : 'rgba(255,255,255,0.02)',
                                                        border: isActive ? `1px solid ${token.color}40` : '1px solid rgba(255,255,255,0.04)',
                                                        boxShadow: isActive ? `0 0 20px ${token.color}10` : 'none',
                                                    }}
                                                >
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                        style={{
                                                            background: isActive ? `${token.color}15` : 'rgba(255,255,255,0.03)',
                                                        }}
                                                    >
                                                        {token.logo}
                                                    </div>
                                                    <span className={`text-xs font-semibold transition-colors ${isActive ? 'text-white' : 'text-white/40'}`}>
                                                        {token.label}
                                                    </span>
                                                    {/* Network badge */}
                                                    <span className={`text-[9px] transition-colors ${isActive ? 'text-white/30' : 'text-white/15'}`}>
                                                        {token.networkLabel}
                                                    </span>

                                                    {/* Selection indicator dot */}
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="tokenSelector"
                                                            className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                                                            style={{ backgroundColor: token.color }}
                                                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                                        />
                                                    )}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Info Rows ── */}
                            {!isProcessing && !isSuccess && (
                                <div className="space-y-0 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div className="flex items-center justify-between px-3.5 py-2.5" style={{ background: 'rgba(255,255,255,0.015)' }}>
                                        <div className="flex items-center gap-2">
                                            <Zap size={12} className="text-white/20" />
                                            <span className="text-[11px] text-white/35">Network</span>
                                        </div>
                                        <span className="text-[11px] text-white/60 font-medium">{activeToken.networkLabel}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div className="flex items-center gap-2">
                                            <Check size={12} className="text-emerald-400/40" />
                                            <span className="text-[11px] text-white/35">Returns on</span>
                                        </div>
                                        <span className="text-[11px] text-emerald-400/70 font-medium">Check-in</span>
                                    </div>
                                    <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div className="flex items-center gap-2">
                                            <Ban size={12} className="text-red-400/30" />
                                            <span className="text-[11px] text-white/35">Forfeit if</span>
                                        </div>
                                        <span className="text-[11px] text-red-400/50 font-medium">No-show</span>
                                    </div>
                                </div>
                            )}

                            {/* ── Action Button ── */}
                            {!isSuccess && (
                                <div className="pt-1">
                                    {!isConnected && !isProcessing ? (
                                        <motion.button
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={handleConnect}
                                            disabled={isEthConnecting}
                                            className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
                                            style={{
                                                background: `linear-gradient(135deg, ${activeToken.gradientFrom}, ${activeToken.gradientTo})`,
                                                boxShadow: `0 4px 24px ${activeToken.color}20`,
                                            }}
                                        >
                                            {isEthConnecting ? (
                                                <><Loader2 size={16} className="animate-spin" /> Connecting...</>
                                            ) : (
                                                <>
                                                    <Wallet size={16} />
                                                    Connect {network === 'solana' ? 'Phantom' : 'MetaMask'}
                                                </>
                                            )}
                                        </motion.button>
                                    ) : isProcessing ? (
                                        <div className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
                                            style={{
                                                background: `${activeToken.color}10`,
                                                border: `1px solid ${activeToken.color}20`,
                                                color: activeToken.color,
                                            }}
                                        >
                                            <Loader2 size={16} className="animate-spin" />
                                            {stakeDeposit.status === 'connecting' && 'Connecting wallet...'}
                                            {stakeDeposit.status === 'preparing' && 'Preparing transaction...'}
                                            {stakeDeposit.status === 'signing' && 'Sign in your wallet...'}
                                            {stakeDeposit.status === 'confirming' && 'Confirming on-chain...'}
                                            {stakeDeposit.status === 'verifying' && 'Verifying deposit...'}
                                        </div>
                                    ) : isError ? (
                                        <motion.button
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={handleDeposit}
                                            className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-all"
                                        >
                                            <RefreshCw size={16} /> Try Again
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={handleDeposit}
                                            className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-white transition-all duration-200"
                                            style={{
                                                background: `linear-gradient(135deg, ${activeToken.gradientFrom}, ${activeToken.gradientTo})`,
                                                boxShadow: `0 4px 24px ${activeToken.color}20`,
                                            }}
                                        >
                                            <Shield size={16} />
                                            Deposit {isNativeMode ? displayTokenAmount : `$${displayAmount}`}
                                        </motion.button>
                                    )}
                                </div>
                            )}

                            {/* ── Success Action ── */}
                            {isSuccess && (
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={onClose}
                                    className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-white transition-all"
                                    style={{
                                        background: `linear-gradient(135deg, ${activeToken.gradientFrom}, ${activeToken.gradientTo})`,
                                        boxShadow: `0 4px 24px ${activeToken.color}20`,
                                    }}
                                >
                                    <Check size={16} /> Done
                                </motion.button>
                            )}

                            {/* ── Wallet Indicator ── */}
                            {isConnected && !isProcessing && !isSuccess && walletAddress && (
                                <div className="flex items-center justify-center gap-2 text-[11px] text-white/25">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span className="font-mono">
                                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
