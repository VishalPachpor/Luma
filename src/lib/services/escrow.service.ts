/**
 * Escrow Service
 * 
 * Backend service integrating the EventEscrow smart contract
 * with the ticket lifecycle system.
 * 
 * Functions:
 *   - Verify stake on-chain
 *   - Release stake on check-in
 *   - Forfeit stake for no-shows
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

// ============================================================================
// Configuration
// ============================================================================

const ETH_RPC_URL = process.env.ETH_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo';
const CHAIN_ID = 11155111; // Sepolia
const ESCROW_SIGNER_KEY = process.env.ESCROW_SIGNER_PRIVATE_KEY || '';

// ============================================================================
// Core Functions
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
