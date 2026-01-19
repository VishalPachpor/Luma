/**
 * useCryptoPayment Hook
 * Manages the Solana payment state machine and Phantom wallet interaction
 */

import { useState, useCallback } from 'react';
import { useSolanaWallet } from '@/contexts/WalletContext';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createSolTransferTransaction, generateReference, PLATFORM_WALLET_ADDRESS } from '@/lib/solana/payment';

// Public RPC endpoint (change to Helius/Alchemy for prod)
const SOLANA_RPC = 'https://api.devnet.solana.com';

export type PaymentState = 'idle' | 'connecting' | 'creating_tx' | 'signing' | 'confirming' | 'success' | 'error';

interface UseCryptoPaymentProps {
    onSuccess?: (signature: string) => void;
    onError?: (error: Error) => void;
}

export function useCryptoPayment({ onSuccess, onError }: UseCryptoPaymentProps = {}) {
    const { solConnected, solAddress, connectSolana } = useSolanaWallet();
    const [status, setStatus] = useState<PaymentState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [txSignature, setTxSignature] = useState<string | null>(null);

    const pay = useCallback(async (amount: number, memo?: string) => {
        setStatus('connecting');
        setError(null);

        try {
            // 1. Ensure Connected
            let userAddress = solAddress;
            if (!solConnected || !userAddress) {
                await connectSolana();
                const provider = (window as any).phantom?.solana;
                if (!provider?.isConnected) {
                    throw new Error('Wallet not connected');
                }
                userAddress = provider.publicKey.toString();
            }

            if (!userAddress) throw new Error('No wallet address found');
            const payer = new PublicKey(userAddress);

            // 2. Setup Connection
            const connection = new Connection(SOLANA_RPC, 'confirmed');

            // 3. Generate Reference
            const reference = generateReference();
            setStatus('creating_tx');

            // 4. Create Transaction
            const tx = await createSolTransferTransaction({
                payer,
                recipient: PLATFORM_WALLET_ADDRESS,
                amount,
                reference,
                memo
            });

            // Get latest blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = payer;

            // 5. Request Signature
            setStatus('signing');
            const provider = (window as any).phantom?.solana;
            if (!provider) throw new Error('Phantom provider not found');

            const { signature } = await provider.signAndSendTransaction(tx);
            setTxSignature(signature);

            // 6. Confirm Transaction
            setStatus('confirming');
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');

            if (confirmation.value.err) {
                throw new Error('Transaction failed on-chain');
            }

            // 7. Success
            setStatus('success');
            onSuccess?.(signature);

        } catch (err: any) {
            console.error('Payment Error:', err);
            let msg = err.message || 'Payment failed';

            // Phantom specific error mapping
            if (err.message?.includes('User rejected')) {
                setStatus('idle');
                return;
            }
            if (err.logs) {
                msg = 'Transaction failed. Check SOL balance or network.';
            }

            setError(msg);
            setStatus('error');
            onError?.(err);
        }
    }, [solConnected, solAddress, connectSolana, onSuccess, onError]);

    const reset = useCallback(() => {
        setStatus('idle');
        setError(null);
        setTxSignature(null);
    }, []);

    return {
        pay,
        reset,
        status,
        error,
        txSignature,
        isConnected: solConnected,
        address: solAddress
    };
}
