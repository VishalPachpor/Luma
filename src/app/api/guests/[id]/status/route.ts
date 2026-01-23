/**
 * Guest Status API
 * 
 * Provides endpoints for:
 *   GET  - Get current status and valid transitions
 *   PATCH - Manually transition guest status
 * 
 * Authorization: Only event organizer or hosts can change status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import {
    transitionTicketStatus,
    getGuestStatusInfo,
    TicketTransitionError,
    isValidTransition,
} from '@/lib/services/ticket-lifecycle.service';
import type { GuestStatus } from '@/types/commerce';

interface RouteContext {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/guests/{id}/status
 * 
 * Returns current status and available transitions
 */
export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    const { id: guestId } = await context.params;

    try {
        const statusInfo = await getGuestStatusInfo(guestId);

        return NextResponse.json({
            guestId,
            ...statusInfo,
        });
    } catch (error) {
        if (error instanceof TicketTransitionError && error.code === 'GUEST_NOT_FOUND') {
            return NextResponse.json(
                { error: 'Guest not found' },
                { status: 404 }
            );
        }

        console.error('[GuestStatusAPI] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to get guest status' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/guests/{id}/status
 * 
 * Body: { 
 *   status: GuestStatus, 
 *   reason?: string,
 *   stakeData?: { amount, currency, txHash, walletAddress },
 *   refundData?: { txHash }
 * }
 * 
 * Transitions the guest to a new status.
 */
export async function PATCH(
    request: NextRequest,
    context: RouteContext
) {
    const { id: guestId } = await context.params;
    const supabase = getServiceSupabase();

    try {
        // 1. Authenticate user
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

        // 2. Get guest and check authorization
        const { data: guest, error: guestError } = await supabase
            .from('guests')
            .select('event_id, status')
            .eq('id', guestId)
            .single();

        if (guestError || !guest) {
            return NextResponse.json(
                { error: 'Guest not found' },
                { status: 404 }
            );
        }

        // Check if user is organizer of the event
        const { data: event } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', guest.event_id)
            .single();

        const isOrganizer = event?.organizer_id === user.id;

        // Check if user is a host
        const { data: hostEntry } = await supabase
            .from('event_hosts' as any)
            .select('id')
            .eq('event_id', guest.event_id)
            .eq('user_id', user.id)
            .maybeSingle();

        const isHost = !!hostEntry;

        if (!isOrganizer && !isHost) {
            return NextResponse.json(
                { error: 'Only organizers and hosts can change guest status' },
                { status: 403 }
            );
        }

        // 3. Parse and validate request body
        const body = await request.json();
        const { status: targetStatus, reason, stakeData, refundData } = body as {
            status: GuestStatus;
            reason?: string;
            stakeData?: {
                amount: number;
                currency: string;
                txHash: string;
                walletAddress?: string;
            };
            refundData?: {
                txHash: string;
            };
        };

        if (!targetStatus) {
            return NextResponse.json(
                { error: 'Missing required field: status' },
                { status: 400 }
            );
        }

        const validStatuses: GuestStatus[] = [
            'pending', 'pending_approval', 'approved', 'rejected',
            'issued', 'staked', 'checked_in', 'scanned', 'refunded', 'forfeited', 'revoked'
        ];

        if (!validStatuses.includes(targetStatus)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // 4. Check if transition is valid
        const currentStatus = guest.status as GuestStatus;
        if (!isValidTransition(currentStatus, targetStatus)) {
            return NextResponse.json(
                {
                    error: `Invalid transition: ${currentStatus} → ${targetStatus}`,
                    currentStatus,
                    targetStatus,
                    validTransitions: validStatuses.filter(s => isValidTransition(currentStatus, s)),
                },
                { status: 400 }
            );
        }

        // 5. Execute the transition
        const result = await transitionTicketStatus({
            guestId,
            targetStatus,
            triggeredBy: `user:${user.id}`,
            reason: reason || 'Manual status change',
            stakeData,
            refundData,
            metadata: {
                userEmail: user.email,
                requestedAt: new Date().toISOString(),
            },
        });

        // 6. Return success
        return NextResponse.json({
            success: true,
            guestId,
            previousStatus: result.previousStatus,
            newStatus: result.newStatus,
            transitionedAt: result.transitionedAt,
        });

    } catch (error) {
        if (error instanceof TicketTransitionError) {
            const statusCode = error.code === 'GUEST_NOT_FOUND' ? 404 : 400;
            return NextResponse.json(
                {
                    error: error.message,
                    code: error.code,
                    fromStatus: error.fromStatus,
                    toStatus: error.toStatus,
                },
                { status: statusCode }
            );
        }

        console.error('[GuestStatusAPI] PATCH error:', error);
        return NextResponse.json(
            { error: 'Failed to update guest status' },
            { status: 500 }
        );
    }
}
