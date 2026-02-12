/**
 * Escrow Stake Verification API
 * 
 * POST /api/escrow/stake
 * Verifies an on-chain stake and updates guest status to 'staked'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyStakeOnChain, getOrganizerWallet } from '@/lib/services/escrow.service';
import { transitionTicketStatus } from '@/lib/services/ticket-lifecycle.service';
import { hashEventId } from '@/lib/contracts/escrow';

export async function POST(request: NextRequest) {
    const supabase = getServiceSupabase();

    try {
        const body = await request.json();
        const { eventId, txHash, walletAddress, guestId } = body;

        // Validate required fields
        if (!eventId || !walletAddress) {
            return NextResponse.json(
                { error: 'Missing required fields: eventId, walletAddress' },
                { status: 400 }
            );
        }

        console.log('[EscrowStake] Verifying stake:', { eventId, walletAddress, txHash });

        // 1. Verify stake exists on-chain
        const verification = await verifyStakeOnChain(eventId, walletAddress);

        if (!verification.verified) {
            return NextResponse.json(
                { error: verification.error || 'Stake not found on-chain' },
                { status: 400 }
            );
        }

        // 2. Find guest record (multi-strategy lookup)
        let guestRecord;

        if (guestId) {
            // Strategy 1: Direct lookup by guestId
            const { data } = await supabase
                .from('guests')
                .select('id, status, user_id')
                .eq('id', guestId)
                .single();
            guestRecord = data;
        }

        if (!guestRecord) {
            // Strategy 2: Lookup by existing stake_wallet_address
            const { data } = await supabase
                .from('guests')
                .select('id, status, user_id')
                .eq('event_id', eventId)
                .eq('stake_wallet_address', walletAddress)
                .maybeSingle();
            guestRecord = data;
        }

        if (!guestRecord) {
            // Strategy 3: Lookup via user profile wallet → guests table
            // Resolves chicken-and-egg: wallet isn't on guest record yet for first-time stakers
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('wallet_address', walletAddress)
                .maybeSingle();

            if (profile) {
                const { data } = await supabase
                    .from('guests')
                    .select('id, status, user_id')
                    .eq('event_id', eventId)
                    .eq('user_id', profile.id)
                    .in('status', ['approved', 'pending', 'pending_approval'])
                    .maybeSingle();
                guestRecord = data;
            }
        }

        if (!guestRecord) {
            return NextResponse.json(
                { error: 'Guest record not found. Ensure you are registered for this event.' },
                { status: 404 }
            );
        }

        // 3. Transition to 'staked' status
        const result = await transitionTicketStatus({
            guestId: guestRecord.id,
            targetStatus: 'staked',
            triggeredBy: 'system',
            reason: 'On-chain stake verified',
            stakeData: {
                amount: Number(verification.stakeInfo?.amount || 0),
                currency: 'ETH',
                txHash: txHash || 'verified-on-chain',
                walletAddress,
            },
        });

        console.log('[EscrowStake] Transition result:', result);

        return NextResponse.json({
            success: true,
            guestId: guestRecord.id,
            previousStatus: result.previousStatus,
            newStatus: result.newStatus,
            stakeInfo: verification.stakeInfo,
        });

    } catch (error: any) {
        console.error('[EscrowStake] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to verify stake' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/escrow/stake
 * Get stake info for an attendee
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const walletAddress = searchParams.get('walletAddress');

    if (!eventId || !walletAddress) {
        return NextResponse.json(
            { error: 'Missing required params: eventId, walletAddress' },
            { status: 400 }
        );
    }

    try {
        const verification = await verifyStakeOnChain(eventId, walletAddress);

        return NextResponse.json({
            hasStake: verification.verified,
            stakeInfo: verification.stakeInfo,
            eventIdHash: hashEventId(eventId),
        });
    } catch (error: any) {
        console.error('[EscrowStake] GET error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
