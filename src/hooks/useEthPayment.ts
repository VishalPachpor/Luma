/**
 * useEthPayment Hook
 * Manages Ethereum/EVM payment lifecycle using wagmi hooks
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { parseEther, type Address } from 'viem';
import { sepolia } from 'wagmi/chains';
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
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const [status, setStatus] = useState<EthPaymentStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const successCalledRef = useRef(false);
    const pendingAmountRef = useRef<string | null>(null);

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
            const errorDetails = (sendError as any)?.details || '';
            const errorCode = (sendError as any)?.code;
            const fullError = `${errorMessage} ${errorDetails}`.toLowerCase();

            console.log('[useEthPayment] Transaction error:', { errorMessage, errorDetails, errorCode });

            // Handle user rejection - just reset to idle (MetaMask popup was shown and user rejected)
            if (fullError.includes('user rejected') ||
                fullError.includes('denied') ||
                fullError.includes('user cancelled') ||
                fullError.includes('rejected the request') ||
                errorCode === 4001) {
                setStatus('idle');
                setError(null);
                return;
            }

            // If error is about gas/insufficient funds, check if it's a network issue
            if (fullError.includes('insufficient') ||
                fullError.includes('gas') ||
                errorCode === -32603) {

                // Check if this is a "have 0" error - likely wrong network or no funds on current network
                if (fullError.includes('have 0')) {
                    const currentChainName = chainId === sepolia.id ? 'Sepolia' : chainId === 1 ? 'Mainnet' : `Chain ${chainId}`;
                    setError(`No ETH found on ${currentChainName} network. Please ensure:\n1. You're connected to the correct network\n2. Your wallet has ETH on ${currentChainName} for gas fees`);
                    setStatus('error');
                    pendingAmountRef.current = null;
                    onError?.(sendError as Error);
                    return;
                }

                console.log('[useEthPayment] Gas estimation error detected, trying MetaMask directly...');

                // Try MetaMask directly - this will show the popup and let MetaMask handle the error
                const ethereum = (window as any).ethereum;
                if (ethereum && address && pendingAmountRef.current) {
                    const amount = pendingAmountRef.current;
                    const value = parseEther(amount);
                    ethereum.request({
                        method: 'eth_sendTransaction',
                        params: [{
                            from: address,
                            to: EVM_RECIPIENT_ADDRESS,
                            value: `0x${value.toString(16)}`,
                        }]
                    }).then((txHash: string) => {
                        console.log('[useEthPayment] MetaMask transaction sent:', txHash);
                        setStatus('success');
                        successCalledRef.current = true;
                        onSuccess?.(txHash);
                    }).catch((metaMaskErr: any) => {
                        console.error('[useEthPayment] MetaMask error:', metaMaskErr);
                        if (metaMaskErr.code === 4001) {
                            // User rejected in MetaMask
                            setStatus('idle');
                            setError(null);
                        } else {
                            // Show error from MetaMask
                            setError(metaMaskErr.message || 'Transaction failed');
                            setStatus('error');
                            onError?.(metaMaskErr);
                        }
                    });
                    return; // Don't set error yet, wait for MetaMask response
                }

                // Fallback: show error if MetaMask not available
                setError('Insufficient ETH in wallet to cover price + gas.');
                setStatus('error');
                onError?.(sendError as Error);
            } else {
                // Other errors - show them
                setError(errorMessage);
                setStatus('error');
                onError?.(sendError as Error);
            }
        } else if (isConfirmError && waitForConfirmation) {
            setError(confirmError?.message || 'Transaction confirmation failed');
            setStatus('error');
            onError?.(confirmError as Error);
        }
    }, [isSending, isConfirming, isConfirmed, isSendError, isConfirmError, txHash, sendError, confirmError, onSuccess, onError, waitForConfirmation, address, chainId]);

    const pay = useCallback(async (amountEth: string) => {
        if (!isConnected || !address) {
            setError('Please connect your wallet first');
            setStatus('error');
            return;
        }

        // Check if we're on the correct network (Sepolia for testing)
        // If not, switch to Sepolia first
        if (chainId !== sepolia.id) {
            console.log(`[useEthPayment] Wrong network (chainId: ${chainId}), switching to Sepolia...`);
            setStatus('switching_network');
            try {
                await switchChain({ chainId: sepolia.id });
                // We return here to let the state update; user will click pay again on the correct network
                // This prevents "insufficient funds" checks running against the old network
                setStatus('idle');
                return;
            } catch (switchErr: any) {
                console.error('[useEthPayment] Network switch failed:', switchErr);
                if (switchErr.code !== 4001) { // Not user rejection
                    setError('Please switch to Sepolia network in MetaMask');
                    setStatus('error');
                    onError?.(switchErr);
                } else {
                    setStatus('idle');
                }
                return;
            }
        }

        setStatus('creating_tx');
        setError(null);
        successCalledRef.current = false;
        pendingAmountRef.current = amountEth; // Store amount for fallback

        try {
            const value = parseEther(amountEth);

            console.log('[useEthPayment] Sending transaction:', {
                to: EVM_RECIPIENT_ADDRESS,
                value: amountEth,
                from: address,
                chainId
            });

            // Send transaction via wagmi - this should trigger MetaMask popup
            // Note: wagmi does gas estimation before showing MetaMask
            // If gas estimation fails (e.g., insufficient funds), MetaMask might not show
            // The error will be caught by useEffect watching isSendError
            console.log('[useEthPayment] Calling sendTransaction - MetaMask should appear');

            setStatus('signing');
            sendTransaction({
                to: EVM_RECIPIENT_ADDRESS as Address,
                value,
            });
        } catch (err: any) {
            console.error('[useEthPayment] Error initiating transaction:', err);
            const errorMessage = err.message || 'Failed to initiate payment';
            // Don't show error for user rejections - those are handled by useEffect
            if (!errorMessage.toLowerCase().includes('user rejected') &&
                !errorMessage.toLowerCase().includes('denied')) {
                setError(errorMessage);
                setStatus('error');
                onError?.(err);
            }
        }
    }, [isConnected, address, chainId, switchChain, sendTransaction, onError]);

    const reset = useCallback(() => {
        setStatus('idle');
        setError(null);
        successCalledRef.current = false;
        pendingAmountRef.current = null;
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

