/**
 * Event Lifecycle State Machine Service
 * 
 * Production-grade state machine for managing event lifecycle transitions.
 * Provides:
 *   - Valid transition validation
 *   - Guard functions (pre-conditions)
 *   - Atomic transitions with audit logging
 *   - Error handling with typed errors
 * 
 * State Flow:
 *   draft → published → live → ended → archived
 *                ↑_______|
 *              (revert)
 */

import { getServiceSupabase } from '@/lib/supabase';
import type { EventStatus } from '@/types/event';

// ============================================================================
// Types
// ============================================================================

export interface TransitionResult {
    success: boolean;
    previousStatus: EventStatus;
    newStatus: EventStatus;
    transitionedAt: string;
    error?: string;
}

export interface TransitionContext {
    eventId: string;
    targetStatus: EventStatus;
    triggeredBy: 'system' | `user:${string}`;
    reason?: string;
    metadata?: Record<string, unknown>;
}

export class TransitionError extends Error {
    constructor(
        message: string,
        public readonly code: TransitionErrorCode,
        public readonly fromStatus?: EventStatus,
        public readonly toStatus?: EventStatus
    ) {
        super(message);
        this.name = 'TransitionError';
    }
}

export type TransitionErrorCode =
    | 'INVALID_TRANSITION'
    | 'EVENT_NOT_FOUND'
    | 'GUARD_FAILED'
    | 'DATABASE_ERROR';

// ============================================================================
// State Machine Definition
// ============================================================================

/**
 * Valid state transitions map.
 * Key is the current status, value is array of allowed target statuses.
 */
const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
    draft: ['published'],
    published: ['live', 'draft', 'archived'],
    live: ['ended'],
    ended: ['archived'],
    archived: [], // Terminal state - no transitions allowed
};

/**
 * Human-readable descriptions for each status
 */
export const STATUS_DESCRIPTIONS: Record<EventStatus, string> = {
    draft: 'Event is being created and is not visible to the public',
    published: 'Event is live and open for registration',
    live: 'Event is currently in progress',
    ended: 'Event has completed',
    archived: 'Event is archived and hidden from listings',
};

// ============================================================================
// Guard Functions
// ============================================================================

type GuardFunction = (eventId: string) => Promise<{ allowed: boolean; reason?: string }>;

/**
 * Guards that must pass before a transition is allowed.
 * These are pre-conditions that check business rules.
 */
const TRANSITION_GUARDS: Partial<Record<`${EventStatus}->${EventStatus}`, GuardFunction>> = {
    // Cannot publish without a title and date
    'draft->published': async (eventId: string) => {
        const supabase = getServiceSupabase();
        const { data: event } = await supabase
            .from('events')
            .select('title, date')
            .eq('id', eventId)
            .single();

        if (!event?.title?.trim()) {
            return { allowed: false, reason: 'Event must have a title before publishing' };
        }
        if (!event?.date) {
            return { allowed: false, reason: 'Event must have a date before publishing' };
        }
        return { allowed: true };
    },

    // Cannot go live if event date is in the future (manual override blocked)
    'published->live': async (eventId: string) => {
        // System cron jobs can always transition
        // Manual transitions should be blocked if date is in future
        // For now, we allow it (cron will handle timing)
        return { allowed: true };
    },

    // Cannot go from live back to draft (would lose check-in data)
    'live->draft': async () => {
        return { allowed: false, reason: 'Cannot revert to draft while event is live' };
    },
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check if a transition is valid according to the state machine.
 */
export function isValidTransition(from: EventStatus, to: EventStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get all valid transitions from a given status.
 */
export function getValidTransitions(from: EventStatus): EventStatus[] {
    return VALID_TRANSITIONS[from] ?? [];
}

/**
 * Execute a state transition with full validation and audit logging.
 * This is the main entry point for all status changes.
 */
export async function transitionEventStatus(
    context: TransitionContext
): Promise<TransitionResult> {
    const supabase = getServiceSupabase();
    const { eventId, targetStatus, triggeredBy, reason, metadata } = context;
    const now = new Date().toISOString();

    // 1. Fetch current event status
    const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('status, title, date')
        .eq('id', eventId)
        .single();

    if (fetchError || !event) {
        throw new TransitionError(
            `Event not found: ${eventId}`,
            'EVENT_NOT_FOUND'
        );
    }

    const currentStatus = event.status as EventStatus;

    // 2. Validate transition is allowed
    if (!isValidTransition(currentStatus, targetStatus)) {
        throw new TransitionError(
            `Invalid transition: ${currentStatus} → ${targetStatus}`,
            'INVALID_TRANSITION',
            currentStatus,
            targetStatus
        );
    }

    // 3. Run guard function if exists
    const guardKey = `${currentStatus}->${targetStatus}` as keyof typeof TRANSITION_GUARDS;
    const guard = TRANSITION_GUARDS[guardKey];

    if (guard) {
        const guardResult = await guard(eventId);
        if (!guardResult.allowed) {
            throw new TransitionError(
                guardResult.reason || 'Guard check failed',
                'GUARD_FAILED',
                currentStatus,
                targetStatus
            );
        }
    }

    // 4. Perform atomic update
    const { error: updateError } = await supabase
        .from('events')
        .update({
            status: targetStatus,
            previous_status: currentStatus,
            transitioned_at: now,
            updated_at: now,
        })
        .eq('id', eventId)
        .eq('status', currentStatus); // Optimistic locking

    if (updateError) {
        throw new TransitionError(
            `Failed to update event status: ${updateError.message}`,
            'DATABASE_ERROR',
            currentStatus,
            targetStatus
        );
    }

    // 5. Log the transition
    await supabase.from('event_status_log').insert({
        event_id: eventId,
        from_status: currentStatus,
        to_status: targetStatus,
        triggered_by: triggeredBy,
        reason: reason,
        metadata: metadata || {},
    });

    // 6. Return success result
    return {
        success: true,
        previousStatus: currentStatus,
        newStatus: targetStatus,
        transitionedAt: now,
    };
}

/**
 * Get the current status and valid transitions for an event.
 * Useful for UI to show available actions.
 */
export async function getEventStatusInfo(eventId: string): Promise<{
    currentStatus: EventStatus;
    validTransitions: EventStatus[];
    description: string;
    lifecycle: {
        scheduledStartAt?: string;
        scheduledEndAt?: string;
        transitionedAt?: string;
        previousStatus?: EventStatus;
    };
}> {
    const supabase = getServiceSupabase();

    const { data: event, error } = await supabase
        .from('events')
        .select('status, scheduled_start_at, scheduled_end_at, transitioned_at, previous_status')
        .eq('id', eventId)
        .single();

    if (error || !event) {
        throw new TransitionError(`Event not found: ${eventId}`, 'EVENT_NOT_FOUND');
    }

    const currentStatus = event.status as EventStatus;

    return {
        currentStatus,
        validTransitions: getValidTransitions(currentStatus),
        description: STATUS_DESCRIPTIONS[currentStatus],
        lifecycle: {
            scheduledStartAt: event.scheduled_start_at,
            scheduledEndAt: event.scheduled_end_at,
            transitionedAt: event.transitioned_at,
            previousStatus: event.previous_status as EventStatus | undefined,
        },
    };
}

/**
 * Find events that should transition to 'live' status.
 * Used by the event.start cron job.
 */
export async function findEventsToStart(): Promise<string[]> {
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    const { data: events, error } = await supabase
        .from('events')
        .select('id')
        .eq('status', 'published')
        .lte('date', now); // Events whose start time has passed

    if (error || !events) {
        console.error('[EventLifecycle] Error finding events to start:', error);
        return [];
    }

    return events.map(e => e.id);
}

/**
 * Find events that should transition to 'ended' status.
 * Used by the event.end cron job.
 */
export async function findEventsToEnd(): Promise<string[]> {
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    const { data: events, error } = await supabase
        .from('events')
        .select('id')
        .eq('status', 'live')
        .not('end_date', 'is', null)
        .lte('end_date', now); // Events whose end time has passed

    if (error || !events) {
        console.error('[EventLifecycle] Error finding events to end:', error);
        return [];
    }

    return events.map(e => e.id);
}

/**
 * Batch transition multiple events (for cron jobs).
 * Returns count of successful transitions.
 */
export async function batchTransition(
    eventIds: string[],
    targetStatus: EventStatus,
    reason: string
): Promise<{ succeeded: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const eventId of eventIds) {
        try {
            await transitionEventStatus({
                eventId,
                targetStatus,
                triggeredBy: 'system',
                reason,
            });
            succeeded++;
        } catch (error) {
            failed++;
            if (error instanceof TransitionError) {
                errors.push(`${eventId}: ${error.message}`);
            } else {
                errors.push(`${eventId}: Unknown error`);
            }
        }
    }

    return { succeeded, failed, errors };
}
