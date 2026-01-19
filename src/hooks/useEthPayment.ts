/**
 * useEthPayment Hook
 * Manages Ethereum/EVM payment lifecycle using wagmi hooks
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { EVM_RECIPIENT_ADDRESS, EthPaymentStatus } from '@/lib/ethereum/payment';

interface UseEthPaymentProps {
    onSuccess?: (hash: string) => void;
    onError?: (error: Error) => void;
    /** If true, wait for block confirmation. If false, consider success once tx submitted */
    waitForConfirmation?: boolean;
}

export function useEthPayment({
    onSuccess,
    onError,
    waitForConfirmation = false // Default: show success immediately for better UX
}: UseEthPaymentProps = {}) {
    const { address, isConnected } = useAccount();
    const [status, setStatus] = useState<EthPaymentStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const successCalledRef = useRef(false);

    const {
        sendTransaction,
        data: txHash,
        isPending: isSending,
        isError: isSendError,
        error: sendError,
        reset: resetSend
    } = useSendTransaction();

    const {
        isLoading: isConfirming,
        isSuccess: isConfirmed,
        isError: isConfirmError,
        error: confirmError
    } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    // Update status based on wagmi hooks state
    useEffect(() => {
        if (isSending) {
            setStatus('signing');
        } else if (txHash && !waitForConfirmation && !successCalledRef.current) {
            // Immediately show success when tx hash received (not waiting for confirmation)
            console.log('[useEthPayment] Transaction submitted!', txHash);
            setStatus('success');
            successCalledRef.current = true;
            onSuccess?.(txHash);
        } else if (isConfirming && waitForConfirmation) {
            setStatus('mining');
        } else if (isConfirmed && txHash && waitForConfirmation && !successCalledRef.current) {
            console.log('[useEthPayment] Transaction confirmed!', txHash);
            setStatus('success');
            successCalledRef.current = true;
            onSuccess?.(txHash);
        } else if (isSendError) {
            const errorMessage = sendError?.message || 'Transaction failed';

            // Handle user rejection - just reset to idle
            if (errorMessage.includes('User rejected') || errorMessage.includes('denied')) {
                setStatus('idle');
                return;
            }

            // Handle insufficient funds
            if (errorMessage.toLowerCase().includes('insufficient')) {
                setError('Insufficient ETH in wallet to cover price + gas.');
            } else {
                setError(errorMessage);
            }
            setStatus('error');
            onError?.(sendError as Error);
        } else if (isConfirmError && waitForConfirmation) {
            setError(confirmError?.message || 'Transaction confirmation failed');
            setStatus('error');
            onError?.(confirmError as Error);
        }
    }, [isSending, isConfirming, isConfirmed, isSendError, isConfirmError, txHash, sendError, confirmError, onSuccess, onError, waitForConfirmation]);

    const pay = useCallback((amountEth: string) => {
        if (!isConnected || !address) {
            setError('Please connect your wallet first');
            setStatus('error');
            return;
        }

        setStatus('creating_tx');
        setError(null);
        successCalledRef.current = false;

        try {
            const value = parseEther(amountEth);

            console.log('[useEthPayment] Sending transaction:', {
                to: EVM_RECIPIENT_ADDRESS,
                value: amountEth,
                from: address
            });

            sendTransaction({
                to: EVM_RECIPIENT_ADDRESS as `0x${string}`,
                value,
            });
        } catch (err: any) {
            console.error('ETH Payment Error:', err);
            setError(err.message || 'Failed to initiate payment');
            setStatus('error');
            onError?.(err);
        }
    }, [isConnected, address, sendTransaction, onError]);

    const reset = useCallback(() => {
        setStatus('idle');
        setError(null);
        successCalledRef.current = false;
        resetSend();
    }, [resetSend]);

    return {
        pay,
        reset,
        status,
        error,
        txHash: txHash || null,
        isConnected,
        address,
        isConfirming, // Expose for UI if needed
        isConfirmed   // Expose for UI if needed
    };
}

