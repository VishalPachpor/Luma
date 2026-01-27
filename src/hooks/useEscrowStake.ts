/**
 * useEscrowStake Hook
 * 
 * Hook for staking ETH via the EventEscrow smart contract.
 * Used in CryptoPaymentModal when event requires staking.
 */

'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, type Address } from 'viem';
import { ESCROW_ABI, ESCROW_ADDRESSES, hashEventId } from '@/lib/contracts/escrow';

type StakeStatus =
    | 'idle'
    | 'connecting'
    | 'switching_network'
    | 'preparing'
    | 'signing'
    | 'confirming'
    | 'success'
    | 'error';

interface UseEscrowStakeOptions {
    onSuccess?: (txHash: string) => void;
}

interface UseEscrowStakeReturn {
    status: StakeStatus;
    error: string | null;
    txHash: string | null;
    stake: (eventId: string, organizerAddress: string, eventStartTime: number, stakeAmount: string) => Promise<void>;
    reset: () => void;
}

export function useEscrowStake(options?: UseEscrowStakeOptions): UseEscrowStakeReturn {
    const [status, setStatus] = useState<StakeStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    const { address, isConnected, chainId } = useAccount();
    const { writeContractAsync, isPending } = useWriteContract();

    const reset = useCallback(() => {
        setStatus('idle');
        setError(null);
        setTxHash(null);
    }, []);

    const stake = useCallback(async (
        eventId: string,
        organizerAddress: string,
        eventStartTime: number,
        stakeAmount: string
    ) => {
        try {
            setStatus('preparing');
            setError(null);

            if (!isConnected || !address) {
                throw new Error('Wallet not connected');
            }

            // Get contract address for current chain (default to Sepolia)
            const contractChainId = chainId || 11155111;
            const contractAddress = ESCROW_ADDRESSES[contractChainId];

            if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
                // If no contract deployed, fall back to direct payment
                console.warn('[useEscrowStake] No escrow contract deployed, staking not available');
                throw new Error('Escrow contract not deployed on this network');
            }

            // Hash the event ID
            const eventIdHash = hashEventId(eventId);

            // Convert stake amount to wei
            const stakeWei = parseEther(stakeAmount);

            setStatus('signing');

            // Call the stake function
            const hash = await writeContractAsync({
                address: contractAddress as `0x${string}`,
                abi: ESCROW_ABI,
                functionName: 'stake',
                args: [eventIdHash as `0x${string}`, organizerAddress as `0x${string}`, BigInt(eventStartTime)],
                value: stakeWei,
            });

            setTxHash(hash);
            setStatus('confirming');

            // Wait for transaction to be mined is handled by parent component
            // Just call success callback with the hash
            setStatus('success');
            options?.onSuccess?.(hash);

        } catch (err: any) {
            console.error('[useEscrowStake] Error:', err);
            setError(err.message || 'Failed to stake');
            setStatus('error');
        }
    }, [isConnected, address, chainId, writeContractAsync, options]);

    return {
        status,
        error,
        txHash,
        stake,
        reset,
    };
}
