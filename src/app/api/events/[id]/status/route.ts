/**
 * Event Status API
 * 
 * Provides endpoints for:
 *   GET  - Get current status and valid transitions
 *   PATCH - Manually transition event status
 * 
 * Authorization: Only event organizer or admins can change status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import {
    transitionEventStatus,
    getEventStatusInfo,
    TransitionError,
    isValidTransition,
} from '@/lib/services/event-lifecycle.service';
import type { EventStatus } from '@/types/event';

interface RouteContext {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/events/{id}/status
 * 
 * Returns current status and available transitions
 */
export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    const { id: eventId } = await context.params;

    try {
        const statusInfo = await getEventStatusInfo(eventId);

        return NextResponse.json({
            eventId,
            ...statusInfo,
        });
    } catch (error) {
        if (error instanceof TransitionError && error.code === 'EVENT_NOT_FOUND') {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        console.error('[StatusAPI] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to get event status' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/events/{id}/status
 * 
 * Body: { status: EventStatus, reason?: string }
 * 
 * Transitions the event to a new status.
 * Only valid transitions are allowed (enforced by state machine).
 */
export async function PATCH(
    request: NextRequest,
    context: RouteContext
) {
    const { id: eventId } = await context.params;
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

        // 2. Check authorization (must be organizer or host)
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('organizer_id, status')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        const isOrganizer = event.organizer_id === user.id;

        // Check if user is a host
        const { data: hostEntry } = await supabase
            .from('event_hosts' as any)
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle();

        const isHost = !!hostEntry;

        if (!isOrganizer && !isHost) {
            return NextResponse.json(
                { error: 'Only organizers and hosts can change event status' },
                { status: 403 }
            );
        }

        // 3. Parse and validate request body
        const body = await request.json();
        const { status: targetStatus, reason } = body as {
            status: EventStatus;
            reason?: string;
        };

        if (!targetStatus) {
            return NextResponse.json(
                { error: 'Missing required field: status' },
                { status: 400 }
            );
        }

        const validStatuses: EventStatus[] = ['draft', 'published', 'live', 'ended', 'archived'];
        if (!validStatuses.includes(targetStatus)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // 4. Check if transition is valid before attempting
        const currentStatus = event.status as EventStatus;
        if (!isValidTransition(currentStatus, targetStatus)) {
            return NextResponse.json(
                {
                    error: `Invalid transition: ${currentStatus} → ${targetStatus}`,
                    currentStatus,
                    targetStatus,
                    hint: `From '${currentStatus}', you can only transition to: ${['draft', 'published', 'live', 'ended', 'archived']
                            .filter(s => isValidTransition(currentStatus, s as EventStatus))
                            .join(', ') || 'no valid transitions'
                        }`
                },
                { status: 400 }
            );
        }

        // 5. Execute the transition
        const result = await transitionEventStatus({
            eventId,
            targetStatus,
            triggeredBy: `user:${user.id}`,
            reason: reason || 'Manual status change by organizer',
            metadata: {
                userEmail: user.email,
                requestedAt: new Date().toISOString(),
            },
        });

        // 6. Return success
        return NextResponse.json({
            success: true,
            eventId,
            previousStatus: result.previousStatus,
            newStatus: result.newStatus,
            transitionedAt: result.transitionedAt,
        });

    } catch (error) {
        if (error instanceof TransitionError) {
            const statusCode = error.code === 'EVENT_NOT_FOUND' ? 404 : 400;
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

        console.error('[StatusAPI] PATCH error:', error);
        return NextResponse.json(
            { error: 'Failed to update event status' },
            { status: 500 }
        );
    }
}
