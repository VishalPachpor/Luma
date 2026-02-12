/**
 * Check-in API
 * POST /api/checkin
 * Validates QR token and marks guest as checked in via the lifecycle service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import {
    transitionTicketStatus,
    TicketTransitionError,
} from '@/lib/services/ticket-lifecycle.service';
import type { GuestStatus } from '@/types/commerce';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { qrToken, eventId } = body;

        // Validate required fields
        if (!qrToken || !eventId) {
            return NextResponse.json(
                { error: 'Missing required fields: qrToken, eventId' },
                { status: 400 }
            );
        }

        // 1. Init Supabase Admin Client
        const supabase = getServiceSupabase();

        // 2. Find guest by QR token (Bypass RLS)
        const { data: guestData, error: findError } = await supabase
            .from('guests')
            .select('id, user_id, ticket_tier_id, status, qr_token, stake_amount, stake_wallet_address')
            .eq('event_id', eventId)
            .eq('qr_token', qrToken)
            .maybeSingle();

        const guest = guestData as {
            id: string;
            user_id: string;
            ticket_tier_id: string | null;
            status: string;
            qr_token: string;
            stake_amount?: number;
            stake_wallet_address?: string;
        } | null;

        if (findError) {
            console.error('[CheckIn API] Find error:', findError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!guest) {
            return NextResponse.json(
                { error: 'Invalid ticket', code: 'INVALID_TOKEN' },
                { status: 404 }
            );
        }

        // 3. Check if already checked in
        if (guest.status === 'checked_in' || guest.status === 'scanned') {
            return NextResponse.json({
                success: true,
                alreadyScanned: true,
                guest: {
                    id: guest.id,
                    userId: guest.user_id,
                    ticketTierId: guest.ticket_tier_id,
                    status: guest.status,
                },
                message: 'Already checked in'
            });
        }

        // 4. Validate check-in eligibility
        const validCheckInStatuses: GuestStatus[] = ['issued', 'staked', 'approved'];
        if (!validCheckInStatuses.includes(guest.status as GuestStatus)) {
            console.log('[CheckIn API] Invalid status for check-in:', { guestId: guest.id, status: guest.status });
            return NextResponse.json(
                { error: `Invalid ticket status: ${guest.status}`, code: 'INVALID_STATUS' },
                { status: 400 }
            );
        }

        // 5. Transition via lifecycle service (provides guards, audit log, optimistic locking)
        let result;
        const previousStatus = guest.status;
        try {
            result = await transitionTicketStatus({
                guestId: guest.id,
                targetStatus: 'checked_in',
                triggeredBy: 'system',
                reason: 'QR code check-in',
            });
        } catch (error) {
            // Fall back to 'scanned' for backward compatibility if 'checked_in'
            // fails (e.g., DB constraint hasn't been migrated yet)
            if (error instanceof TicketTransitionError) {
                console.warn('[CheckIn API] checked_in transition failed, falling back to scanned:', error.message);
                result = await transitionTicketStatus({
                    guestId: guest.id,
                    targetStatus: 'scanned',
                    triggeredBy: 'system',
                    reason: 'QR code check-in (scanned fallback)',
                });
            } else {
                throw error;
            }
        }

        // 6. Trigger escrow release if this was a staked ticket (async via Inngest)
        if (previousStatus === 'staked' && guest.stake_wallet_address) {
            try {
                const { inngest } = await import('@/inngest/client');
                await inngest.send({
                    name: 'app/ticket_checked_in',
                    data: {
                        guestId: guest.id,
                        eventId,
                        stakeWalletAddress: guest.stake_wallet_address,
                    },
                });
            } catch (inngestError) {
                // Log but don't fail the check-in — escrow release can be retried
                console.error('[CheckIn API] Inngest send failed:', inngestError);
            }
        }

        // 7. Return success
        return NextResponse.json({
            success: true,
            alreadyScanned: false,
            guest: {
                id: guest.id,
                userId: guest.user_id,
                ticketTierId: guest.ticket_tier_id,
                status: result.newStatus,
            },
            previousStatus: result.previousStatus,
            newStatus: result.newStatus,
            willReleaseEscrow: previousStatus === 'staked' && !!guest.stake_wallet_address,
            message: 'Check-in successful'
        });

    } catch (error: any) {
        // Handle lifecycle errors with structured response
        if (error instanceof TicketTransitionError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: 400 }
            );
        }

        console.error('[CheckIn API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

