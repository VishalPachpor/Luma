/**
 * CryptoCheckout Component
 * Handles wallet connection and crypto payment for tickets
 * Supports dynamic wallet addresses from calendar payment config
 * Supports Ethereum (MetaMask) and Solana (Phantom)
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, CheckCircle, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button, GlossyCard } from '@/components/components/ui';
import { TicketTier } from '@/types/commerce';
import { useAuth } from '@/contexts/AuthContext';

interface EthereumProvider {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeListener: (event: string, callback: (...args: any[]) => void) => void;
}

interface SolanaProvider {
    connect: () => Promise<{ publicKey: { toString: () => string } }>;
    signAndSendTransaction: (transaction: any) => Promise<{ signature: string }>;
    publicKey: { toString: () => string } | null;
}

interface CryptoCheckoutProps {
    tier: TicketTier;
    quantity: number;
    eventId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

interface PaymentConfig {
    wallet_address: string | null;
    network: 'ethereum' | 'solana';
    accepted_tokens: string[];
    configured: boolean;
}

type CheckoutState = 'loading' | 'idle' | 'connecting' | 'sending' | 'verifying' | 'success' | 'error';

export default function CryptoCheckout({ tier, quantity, eventId, onSuccess, onCancel }: CryptoCheckoutProps) {
    const { user } = useAuth();
    const [state, setState] = useState<CheckoutState>('loading');
    const [txHash, setTxHash] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);

    const totalAmount = tier.price * quantity;

    // Fetch payment configuration on mount
    useEffect(() => {
        async function fetchConfig() {
            try {
                const res = await fetch(`/api/payments/config?eventId=${eventId}`);
                if (!res.ok) throw new Error('Failed to fetch payment config');
                const data = await res.json();
                setPaymentConfig(data);
                setState('idle');
            } catch (err: any) {
                console.error('[CryptoCheckout] Config fetch error:', err);
                setError('Unable to load payment settings. Please try again.');
                setState('error');
            }
        }
        fetchConfig();
    }, [eventId]);

    // Ethereum Payment Handler
    const handleEthereumPayment = async () => {
        const ethereum = (window as any).ethereum as EthereumProvider | undefined;

        if (!ethereum) {
            setError('Please install MetaMask or another Ethereum wallet');
            setState('error');
            return;
        }

        if (!paymentConfig?.wallet_address) {
            setError('Event organizer has not configured payment settings');
            setState('error');
            return;
        }

        try {
            setState('connecting');

            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error('No wallet connected');
            }

            const fromAddress = accounts[0];
            setState('sending');

            // Convert amount to wei
            const amountInWei = BigInt(Math.floor(totalAmount * 1e18)).toString(16);

            const hash = await ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: fromAddress,
                    to: paymentConfig.wallet_address,
                    value: '0x' + amountInWei,
                }],
            });

            setTxHash(hash);
            setState('verifying');

            // Verify with backend
            const response = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reference: hash,
                    amount: totalAmount,
                    eventId,
                    userId: user?.uid,
                    chain: 'ethereum',
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Payment verification failed');
            }

            setState('success');
            setTimeout(() => onSuccess(), 2000);

        } catch (err: any) {
            console.error('[CryptoCheckout] Ethereum payment error:', err);
            setError(err.message || 'Payment failed');
            setState('error');
        }
    };

    // Solana Payment Handler
    const handleSolanaPayment = async () => {
        const solana = (window as any).solana as SolanaProvider | undefined;

        if (!solana) {
            setError('Please install Phantom or another Solana wallet');
            setState('error');
            return;
        }

        if (!paymentConfig?.wallet_address) {
            setError('Event organizer has not configured payment settings');
            setState('error');
            return;
        }

        try {
            setState('connecting');

            // Connect wallet
            const { publicKey } = await solana.connect();
            const fromAddress = publicKey.toString();

            setState('sending');

            // Import Solana libraries dynamically to avoid SSR issues
            const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');

            const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
            const recipientPubkey = new PublicKey(paymentConfig.wallet_address);
            const senderPubkey = new PublicKey(fromAddress);

            // Create transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: senderPubkey,
                    toPubkey: recipientPubkey,
                    lamports: Math.floor(totalAmount * LAMPORTS_PER_SOL),
                })
            );

            // Get recent blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = senderPubkey;

            // Sign and send
            const { signature } = await solana.signAndSendTransaction(transaction);

            setTxHash(signature);
            setState('verifying');

            // Verify with backend
            const response = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reference: signature,
                    amount: totalAmount,
                    eventId,
                    userId: user?.uid,
                    chain: 'solana',
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Payment verification failed');
            }

            setState('success');
            setTimeout(() => onSuccess(), 2000);

        } catch (err: any) {
            console.error('[CryptoCheckout] Solana payment error:', err);
            setError(err.message || 'Payment failed');
            setState('error');
        }
    };

    // Main payment handler - routes to correct network
    const handlePayment = () => {
        if (paymentConfig?.network === 'solana') {
            handleSolanaPayment();
        } else {
            handleEthereumPayment();
        }
    };

    // Explorer URL helper
    const getExplorerUrl = () => {
        if (!txHash) return '';
        if (paymentConfig?.network === 'solana') {
            return `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
        }
        return `https://etherscan.io/tx/${txHash}`;
    };

    const getExplorerName = () => {
        return paymentConfig?.network === 'solana' ? 'Solana Explorer' : 'Etherscan';
    };

    return (
        <GlossyCard className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-xl font-bold text-white">Complete Payment</h2>
                <p className="text-text-muted mt-1">
                    Pay with {paymentConfig?.network === 'solana' ? 'Solana' : 'Ethereum'}
                </p>
            </div>

            {/* Order Summary */}
            <div className="p-4 bg-white/5 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Ticket</span>
                    <span className="text-white">{tier.name} × {quantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Price per ticket</span>
                    <span className="text-white">{tier.price} {tier.currency}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between">
                    <span className="font-medium text-white">Total</span>
                    <span className="font-bold text-lg text-white">{totalAmount.toFixed(4)} {tier.currency}</span>
                </div>
                {paymentConfig && (
                    <div className="pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-text-muted">Network</span>
                            <span className={`px-2 py-0.5 rounded-full font-bold ${paymentConfig.network === 'solana'
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                {paymentConfig.network === 'solana' ? 'SOLANA' : 'ETHEREUM'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Display */}
            <div className="min-h-[120px] flex items-center justify-center">
                {state === 'loading' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <Loader2 className="w-12 h-12 text-indigo-400 mx-auto mb-3 animate-spin" />
                        <p className="text-text-muted text-sm">Loading payment settings...</p>
                    </motion.div>
                )}

                {state === 'idle' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <Wallet className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                        <p className="text-text-muted text-sm">Click below to connect your wallet and pay</p>
                    </motion.div>
                )}

                {(state === 'connecting' || state === 'sending' || state === 'verifying') && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <Loader2 className="w-12 h-12 text-indigo-400 mx-auto mb-3 animate-spin" />
                        <p className="text-white font-medium">
                            {state === 'connecting' && 'Connecting wallet...'}
                            {state === 'sending' && 'Confirm transaction in wallet...'}
                            {state === 'verifying' && 'Verifying payment...'}
                        </p>
                        {txHash && (
                            <a
                                href={getExplorerUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 text-sm flex items-center justify-center gap-1 mt-2 hover:underline"
                            >
                                View on {getExplorerName()} <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </motion.div>
                )}

                {state === 'success' && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center"
                    >
                        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-3" />
                        <p className="text-white font-bold text-lg">Payment Successful!</p>
                        <p className="text-text-muted text-sm mt-1">Your ticket has been issued</p>
                    </motion.div>
                )}

                {state === 'error' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <p className="text-red-400 font-medium">{error}</p>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                setState('idle');
                                setError('');
                            }}
                            className="mt-4"
                        >
                            Try Again
                        </Button>
                    </motion.div>
                )}
            </div>

            {/* Action Buttons */}
            {state === 'idle' && paymentConfig?.configured && (
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onCancel} className="flex-1">
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePayment}
                        className="flex-1 gap-2 bg-gradient-to-r from-indigo-500 to-purple-500"
                    >
                        <Wallet className="w-4 h-4" />
                        Connect & Pay
                    </Button>
                </div>
            )}

            {/* Not Configured Warning */}
            {state === 'idle' && !paymentConfig?.configured && (
                <div className="text-center p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                    <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-yellow-400 font-medium text-sm">
                        Payment not configured
                    </p>
                    <p className="text-yellow-400/70 text-xs mt-1">
                        The event organizer has not set up crypto payments yet.
                    </p>
                    <Button variant="secondary" onClick={onCancel} className="mt-4">
                        Go Back
                    </Button>
                </div>
            )}
        </GlossyCard>
    );
}
