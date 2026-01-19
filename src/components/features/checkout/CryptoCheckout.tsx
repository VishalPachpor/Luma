/**
 * CryptoCheckout Component
 * Handles wallet connection and crypto payment for tickets
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, CheckCircle, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button, GlossyCard } from '@/components/components/ui';
import { TicketTier } from '@/types/commerce';
import { useAuth } from '@/contexts/AuthContext';

interface CryptoCheckoutProps {
    tier: TicketTier;
    quantity: number;
    eventId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

type CheckoutState = 'idle' | 'connecting' | 'sending' | 'verifying' | 'success' | 'error';

// Payment receiver address (should be configured per event in production)
const PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f...';

export default function CryptoCheckout({ tier, quantity, eventId, onSuccess, onCancel }: CryptoCheckoutProps) {
    const { user } = useAuth();
    const [state, setState] = useState<CheckoutState>('idle');
    const [txHash, setTxHash] = useState<string>('');
    const [error, setError] = useState<string>('');

    const totalAmount = tier.price * quantity;

    const handlePayment = async () => {
        if (!window.ethereum) {
            setError('Please install a Web3 wallet like MetaMask');
            setState('error');
            return;
        }

        try {
            setState('connecting');

            // Request wallet connection
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error('No wallet connected');
            }

            const fromAddress = accounts[0];
            setState('sending');

            // Convert amount to wei (assuming ETH)
            const amountInWei = BigInt(Math.floor(totalAmount * 1e18)).toString(16);

            // Send transaction
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: fromAddress,
                    to: PAYMENT_ADDRESS,
                    value: '0x' + amountInWei,
                }],
            });

            setTxHash(txHash);
            setState('verifying');

            // Verify payment with backend
            const response = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reference: txHash,
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
            console.error('Payment error:', err);
            setError(err.message || 'Payment failed');
            setState('error');
        }
    };

    return (
        <GlossyCard className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-xl font-bold text-white">Complete Payment</h2>
                <p className="text-text-muted mt-1">Pay with your crypto wallet</p>
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
            </div>

            {/* Status Display */}
            <div className="min-h-[120px] flex items-center justify-center">
                {state === 'idle' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                    >
                        <Wallet className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                        <p className="text-text-muted text-sm">Click below to connect your wallet and pay</p>
                    </motion.div>
                )}

                {(state === 'connecting' || state === 'sending' || state === 'verifying') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                    >
                        <Loader2 className="w-12 h-12 text-indigo-400 mx-auto mb-3 animate-spin" />
                        <p className="text-white font-medium">
                            {state === 'connecting' && 'Connecting wallet...'}
                            {state === 'sending' && 'Confirm transaction in wallet...'}
                            {state === 'verifying' && 'Verifying payment...'}
                        </p>
                        {txHash && (
                            <a
                                href={`https://etherscan.io/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 text-sm flex items-center justify-center gap-1 mt-2 hover:underline"
                            >
                                View on Etherscan <ExternalLink className="w-3 h-3" />
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
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                    >
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
            {state === 'idle' && (
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        className="flex-1"
                    >
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
        </GlossyCard>
    );
}

// Type declaration for window.ethereum
declare global {
    interface Window {
        ethereum?: {
            request: (args: { method: string; params?: any[] }) => Promise<any>;
            on: (event: string, callback: (...args: any[]) => void) => void;
            removeListener: (event: string, callback: (...args: any[]) => void) => void;
        };
    }
}
