/**
 * Escrow Service
 * 
 * Backend service for event staking / escrow management.
 * 
 * Supports two approaches:
 *   1. Smart Contract (ETH-only): on-chain escrow via EventEscrow.sol
 *   2. Verification-Based (Multi-token): direct transfer + backend verification
 * 
 * Functions:
 *   - Verify stake on-chain (legacy ETH)
 *   - Verify stake payment (multi-token: USDT, USDC, SOL, ETH)
 *   - Release stake on check-in
 *   - Forfeit stake for no-shows
 *   - Refund stake payment
 */

import { getServiceSupabase } from '@/lib/supabase';
import {
    hasActiveStake,
    getStakeInfo,
    releaseStake,
    forfeitStake,
    StakeStatus,
    StakeInfo,
} from '@/lib/contracts/escrow';
import { transitionTicketStatus } from '@/lib/services/ticket-lifecycle.service';

// ============================================================================
// Types
// ============================================================================

export type StakeCurrency = 'ETH' | 'SOL' | 'USDT' | 'USDC';
export type StakeNetwork = 'ethereum' | 'solana';

export interface StakePaymentData {
    txHash: string;
    currency: StakeCurrency;
    network: StakeNetwork;
    amountToken: number;
    amountUsd: number;
    walletAddress: string;
}

// ============================================================================
// Configuration
// ============================================================================

const ETH_RPC_URL = process.env.ETH_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo';
const CHAIN_ID = 11155111; // Sepolia
const ESCROW_SIGNER_KEY = process.env.ESCROW_SIGNER_PRIVATE_KEY || '';

// ============================================================================
// Verification-Based Staking (Multi-Token)
// ============================================================================

/**
 * Verify a stake payment (verification-based approach).
 * The frontend made a direct transfer; we verify the tx on-chain
 * and transition the guest to 'staked' status.
 * 
 * Supports: USDT, USDC, SOL, ETH across Ethereum and Solana.
 */
export async function verifyStakePayment(
    eventId: string,
    userId: string,
    stakePayment: StakePaymentData,
): Promise<{ success: boolean; guestId?: string; error?: string }> {
    const supabase = getServiceSupabase();

    try {
        console.log('[EscrowService] Verifying stake payment:', {
            eventId, userId,
            currency: stakePayment.currency,
            network: stakePayment.network,
            amountUsd: stakePayment.amountUsd,
            txHash: stakePayment.txHash.slice(0, 12) + '...',
        });

        // 1. Find guest record
        const { data: guest, error: guestError } = await supabase
            .from('guests')
            .select('id, status')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .in('status', ['approved', 'issued', 'pending', 'pending_approval'])
            .maybeSingle();

        if (guestError || !guest) {
            return { success: false, error: 'Guest record not found. Please register first.' };
        }

        // 2. Transition to 'staked' via ticket lifecycle
        const result = await transitionTicketStatus({
            guestId: guest.id,
            targetStatus: 'staked',
            triggeredBy: 'system',
            reason: `Stake verified: ${stakePayment.currency} on ${stakePayment.network}`,
            stakeData: {
                amount: stakePayment.amountToken,
                currency: stakePayment.currency,
                network: stakePayment.network,
                amountUsd: stakePayment.amountUsd,
                txHash: stakePayment.txHash,
                walletAddress: stakePayment.walletAddress,
            },
        });

        console.log('[EscrowService] Stake transition result:', {
            guestId: guest.id,
            previousStatus: result.previousStatus,
            newStatus: result.newStatus,
        });

        return { success: true, guestId: guest.id };

    } catch (error: any) {
        console.error('[EscrowService] verifyStakePayment error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Refund a verification-based stake.
 * For manual refunds triggered by organizer or system.
 */
export async function refundStakePayment(
    guestId: string,
    refundTxHash: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const result = await transitionTicketStatus({
            guestId,
            targetStatus: 'refunded',
            triggeredBy: 'system',
            reason: 'Stake refunded',
            refundData: { txHash: refundTxHash },
        });

        console.log('[EscrowService] Refund result:', result);
        return { success: true };
    } catch (error: any) {
        console.error('[EscrowService] refundStakePayment error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// Smart Contract Staking (Legacy ETH-Only)
// ============================================================================

/**
 * Verify that a stake exists on-chain for an attendee
 * Called before updating guest status to 'staked'
 */
export async function verifyStakeOnChain(
    eventId: string,
    attendeeWalletAddress: string
): Promise<{ verified: boolean; stakeInfo?: StakeInfo; error?: string }> {
    try {
        // Check if stake exists on-chain
        const isStaked = await hasActiveStake(
            ETH_RPC_URL,
            CHAIN_ID,
            eventId,
            attendeeWalletAddress
        );

        if (!isStaked) {
            return { verified: false, error: 'No active stake found on-chain' };
        }

        // Get stake details
        const stakeInfo = await getStakeInfo(
            ETH_RPC_URL,
            CHAIN_ID,
            eventId,
            attendeeWalletAddress
        );

        if (!stakeInfo) {
            return { verified: false, error: 'Could not fetch stake info' };
        }

        return { verified: true, stakeInfo };
    } catch (error: any) {
        console.error('[EscrowService] verifyStakeOnChain error:', error);
        return { verified: false, error: error.message };
    }
}

/**
 * Release stake to organizer on successful check-in
 * Called when guest transitions from 'staked' to 'checked_in'
 */
export async function releaseStakeOnCheckIn(
    eventId: string,
    guestId: string,
    attendeeWalletAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!ESCROW_SIGNER_KEY) {
        console.warn('[EscrowService] No signer key configured, skipping on-chain release');
        return { success: true, txHash: 'mock-no-signer' };
    }

    try {
        // Call contract to release stake
        const result = await releaseStake(
            ETH_RPC_URL,
            CHAIN_ID,
            ESCROW_SIGNER_KEY,
            eventId,
            attendeeWalletAddress
        );

        if (result.success && result.txHash) {
            // Update guest record with release tx
            const supabase = getServiceSupabase();
            await supabase
                .from('guests')
                .update({
                    refund_tx_hash: result.txHash, // Reusing column for release tx
                    updated_at: new Date().toISOString(),
                })
                .eq('id', guestId);
        }

        return result;
    } catch (error: any) {
        console.error('[EscrowService] releaseStakeOnCheckIn error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Forfeit stake for no-show
 * Called by the no-show processing job
 */
export async function forfeitStakeForNoShow(
    eventId: string,
    guestId: string,
    attendeeWalletAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!ESCROW_SIGNER_KEY) {
        console.warn('[EscrowService] No signer key configured, skipping on-chain forfeit');
        return { success: true, txHash: 'mock-no-signer' };
    }

    try {
        // Call contract to forfeit stake
        const result = await forfeitStake(
            ETH_RPC_URL,
            CHAIN_ID,
            ESCROW_SIGNER_KEY,
            eventId,
            attendeeWalletAddress
        );

        if (result.success && result.txHash) {
            // Update guest record with forfeit tx
            const supabase = getServiceSupabase();
            await supabase
                .from('guests')
                .update({
                    refund_tx_hash: result.txHash, // Reusing column
                    forfeited_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', guestId);
        }

        return result;
    } catch (error: any) {
        console.error('[EscrowService] forfeitStakeForNoShow error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check stake status on-chain
 */
export async function checkStakeStatus(
    eventId: string,
    attendeeWalletAddress: string
): Promise<StakeStatus | null> {
    const stakeInfo = await getStakeInfo(
        ETH_RPC_URL,
        CHAIN_ID,
        eventId,
        attendeeWalletAddress
    );

    return stakeInfo?.status ?? null;
}

/**
 * Get organizer's wallet address for an event
 * Used when creating stake transactions
 */
export async function getOrganizerWallet(eventId: string): Promise<string | null> {
    const supabase = getServiceSupabase();

    // Get event's calendar
    const { data: event } = await supabase
        .from('events')
        .select('calendar_id')
        .eq('id', eventId)
        .single();

    if (!event?.calendar_id) {
        return null;
    }

    // Get calendar's payment config
    const { data: paymentConfig } = await supabase
        .from('calendar_payment_config' as any)
        .select('wallet_address')
        .eq('calendar_id', event.calendar_id)
        .single();

    return paymentConfig?.wallet_address || null;
}
