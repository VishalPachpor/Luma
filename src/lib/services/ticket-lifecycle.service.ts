/**
 * Ticket/Guest Lifecycle State Machine Service
 * 
 * Production-grade state machine for managing ticket/guest status transitions.
 * Supports staking, check-in, refunds, and no-show processing.
 * 
 * State Flow:
 *   pending → pending_approval → approved → staked → checked_in
 *                    ↓                         ↓
 *                rejected                 refunded/forfeited
 */

import { getServiceSupabase } from '@/lib/supabase';
import type { GuestStatus } from '@/types/commerce';
import { isTerminalStatus } from '@/types/commerce';

// ============================================================================
// Types
// ============================================================================

export interface TicketTransitionResult {
    success: boolean;
    previousStatus: GuestStatus;
    newStatus: GuestStatus;
    transitionedAt: string;
    error?: string;
}

export interface TicketTransitionContext {
    guestId: string;
    targetStatus: GuestStatus;
    triggeredBy: 'system' | `user:${string}`;
    reason?: string;
    metadata?: Record<string, unknown>;
    // Staking data (for approved → staked)
    stakeData?: {
        amount: number;
        currency: string;
        txHash: string;
        walletAddress?: string;
    };
    // Refund data (for staked → refunded)
    refundData?: {
        txHash: string;
    };
}

export class TicketTransitionError extends Error {
    constructor(
        message: string,
        public readonly code: TicketTransitionErrorCode,
        public readonly fromStatus?: GuestStatus,
        public readonly toStatus?: GuestStatus
    ) {
        super(message);
        this.name = 'TicketTransitionError';
    }
}

export type TicketTransitionErrorCode =
    | 'INVALID_TRANSITION'
    | 'GUEST_NOT_FOUND'
    | 'TERMINAL_STATUS'
    | 'GUARD_FAILED'
    | 'DATABASE_ERROR';

// ============================================================================
// State Machine Definition
// ============================================================================

/**
 * Valid state transitions map.
 * Key is the current status, value is array of allowed target statuses.
 */
const VALID_TRANSITIONS: Record<GuestStatus, GuestStatus[]> = {
    pending: ['pending_approval', 'issued'],
    pending_approval: ['approved', 'rejected'],
    approved: ['staked', 'issued', 'revoked'],
    rejected: [], // Terminal
    issued: ['checked_in', 'scanned', 'revoked'],
    staked: ['checked_in', 'scanned', 'refunded', 'forfeited'],
    checked_in: [], // Terminal
    scanned: [], // Terminal (legacy, same as checked_in)
    refunded: [], // Terminal
    forfeited: [], // Terminal
    revoked: [], // Terminal
};

/**
 * Human-readable descriptions for each status
 */
export const STATUS_DESCRIPTIONS: Record<GuestStatus, string> = {
    pending: 'Registration pending',
    pending_approval: 'Waiting for organizer approval',
    approved: 'Approved, awaiting payment or ticket claim',
    rejected: 'Registration rejected by organizer',
    issued: 'Ticket issued, ready for check-in',
    staked: 'Payment received, awaiting check-in',
    checked_in: 'Successfully checked in',
    scanned: 'Successfully checked in (legacy)',
    refunded: 'Payment refunded',
    forfeited: 'No-show, payment forfeited',
    revoked: 'Ticket revoked by organizer',
};

// ============================================================================
// Guard Functions
// ============================================================================

type GuardFunction = (guestId: string, context: TicketTransitionContext) => Promise<{ allowed: boolean; reason?: string }>;

const TRANSITION_GUARDS: Partial<Record<`${GuestStatus}->${GuestStatus}`, GuardFunction>> = {
    // Must have stake data when transitioning to staked
    'approved->staked': async (guestId, context) => {
        if (!context.stakeData) {
            return { allowed: false, reason: 'Stake data required for staking transition' };
        }
        if (!context.stakeData.txHash) {
            return { allowed: false, reason: 'Transaction hash required for staking' };
        }
        return { allowed: true };
    },

    // Must have refund tx when refunding
    'staked->refunded': async (guestId, context) => {
        if (!context.refundData?.txHash) {
            return { allowed: false, reason: 'Refund transaction hash required' };
        }
        return { allowed: true };
    },

    // Cannot forfeit if event hasn't ended
    'staked->forfeited': async (guestId) => {
        const supabase = getServiceSupabase();

        // Get guest's event
        const { data: guest } = await supabase
            .from('guests')
            .select('event_id')
            .eq('id', guestId)
            .single();

        if (!guest) {
            return { allowed: false, reason: 'Guest not found' };
        }

        // Check if event has ended
        const { data: event } = await supabase
            .from('events')
            .select('status, end_date')
            .eq('id', guest.event_id)
            .single();

        if (!event) {
            return { allowed: false, reason: 'Event not found' };
        }

        const eventEnded = event.status === 'ended' || event.status === 'archived';
        const endDatePassed = event.end_date && new Date(event.end_date) < new Date();

        if (!eventEnded && !endDatePassed) {
            return { allowed: false, reason: 'Cannot forfeit until event has ended' };
        }

        return { allowed: true };
    },
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check if a transition is valid according to the state machine.
 */
export function isValidTransition(from: GuestStatus, to: GuestStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get all valid transitions from a given status.
 */
export function getValidTransitions(from: GuestStatus): GuestStatus[] {
    return VALID_TRANSITIONS[from] ?? [];
}

/**
 * Execute a state transition with full validation and audit logging.
 */
export async function transitionTicketStatus(
    context: TicketTransitionContext
): Promise<TicketTransitionResult> {
    const supabase = getServiceSupabase();
    const { guestId, targetStatus, triggeredBy, reason, metadata, stakeData, refundData } = context;
    const now = new Date().toISOString();

    // 1. Fetch current guest status
    const { data: guest, error: fetchError } = await supabase
        .from('guests')
        .select('status, event_id')
        .eq('id', guestId)
        .single();

    if (fetchError || !guest) {
        throw new TicketTransitionError(
            `Guest not found: ${guestId}`,
            'GUEST_NOT_FOUND'
        );
    }

    const currentStatus = guest.status as GuestStatus;

    // 2. Check if already in terminal state
    if (isTerminalStatus(currentStatus)) {
        throw new TicketTransitionError(
            `Cannot transition from terminal status: ${currentStatus}`,
            'TERMINAL_STATUS',
            currentStatus,
            targetStatus
        );
    }

    // 3. Validate transition is allowed
    if (!isValidTransition(currentStatus, targetStatus)) {
        throw new TicketTransitionError(
            `Invalid transition: ${currentStatus} → ${targetStatus}`,
            'INVALID_TRANSITION',
            currentStatus,
            targetStatus
        );
    }

    // 4. Run guard function if exists
    const guardKey = `${currentStatus}->${targetStatus}` as keyof typeof TRANSITION_GUARDS;
    const guard = TRANSITION_GUARDS[guardKey];

    if (guard) {
        const guardResult = await guard(guestId, context);
        if (!guardResult.allowed) {
            throw new TicketTransitionError(
                guardResult.reason || 'Guard check failed',
                'GUARD_FAILED',
                currentStatus,
                targetStatus
            );
        }
    }

    // 5. Build update payload
    const updatePayload: Record<string, any> = {
        status: targetStatus,
        previous_status: currentStatus,
        status_changed_at: now,
        updated_at: now,
    };

    // Add staking data if transitioning to staked
    if (targetStatus === 'staked' && stakeData) {
        updatePayload.stake_amount = stakeData.amount;
        updatePayload.stake_currency = stakeData.currency;
        updatePayload.stake_tx_hash = stakeData.txHash;
        updatePayload.stake_wallet_address = stakeData.walletAddress;
    }

    // Add timestamps for terminal states
    if (targetStatus === 'checked_in' || targetStatus === 'scanned') {
        updatePayload.checked_in_at = now;
    }
    if (targetStatus === 'refunded') {
        updatePayload.refunded_at = now;
        if (refundData?.txHash) {
            updatePayload.refund_tx_hash = refundData.txHash;
        }
    }
    if (targetStatus === 'forfeited') {
        updatePayload.forfeited_at = now;
    }

    // 6. Perform atomic update
    const { error: updateError } = await supabase
        .from('guests')
        .update(updatePayload)
        .eq('id', guestId)
        .eq('status', currentStatus); // Optimistic locking

    if (updateError) {
        throw new TicketTransitionError(
            `Failed to update guest status: ${updateError.message}`,
            'DATABASE_ERROR',
            currentStatus,
            targetStatus
        );
    }

    // 7. Log the transition
    await supabase.from('guest_status_log').insert({
        guest_id: guestId,
        event_id: guest.event_id,
        from_status: currentStatus,
        to_status: targetStatus,
        triggered_by: triggeredBy,
        reason: reason,
        metadata: metadata || {},
    });

    // 8. Return success result
    return {
        success: true,
        previousStatus: currentStatus,
        newStatus: targetStatus,
        transitionedAt: now,
    };
}

/**
 * Get the current status and valid transitions for a guest.
 */
export async function getGuestStatusInfo(guestId: string): Promise<{
    currentStatus: GuestStatus;
    validTransitions: GuestStatus[];
    description: string;
    isTerminal: boolean;
    lifecycle: {
        stakeAmount?: number;
        stakeCurrency?: string;
        stakeTxHash?: string;
        checkedInAt?: string;
        forfeitedAt?: string;
        refundedAt?: string;
    };
}> {
    const supabase = getServiceSupabase();

    const { data: guest, error } = await supabase
        .from('guests')
        .select('status, stake_amount, stake_currency, stake_tx_hash, checked_in_at, forfeited_at, refunded_at')
        .eq('id', guestId)
        .single();

    if (error || !guest) {
        throw new TicketTransitionError(`Guest not found: ${guestId}`, 'GUEST_NOT_FOUND');
    }

    const currentStatus = guest.status as GuestStatus;

    return {
        currentStatus,
        validTransitions: getValidTransitions(currentStatus),
        description: STATUS_DESCRIPTIONS[currentStatus],
        isTerminal: isTerminalStatus(currentStatus),
        lifecycle: {
            stakeAmount: guest.stake_amount,
            stakeCurrency: guest.stake_currency,
            stakeTxHash: guest.stake_tx_hash,
            checkedInAt: guest.checked_in_at,
            forfeitedAt: guest.forfeited_at,
            refundedAt: guest.refunded_at,
        },
    };
}

/**
 * Find staked guests for ended events (for no-show processing).
 * Returns guests that should be forfeited.
 */
export async function findGuestsToForfeit(): Promise<string[]> {
    const supabase = getServiceSupabase();

    // Find guests with 'staked' status whose events have ended
    const { data: guests, error } = await supabase
        .from('guests')
        .select(`
            id,
            event_id,
            events!inner(status, end_date)
        `)
        .eq('status', 'staked');

    if (error || !guests) {
        console.error('[TicketLifecycle] Error finding guests to forfeit:', error);
        return [];
    }

    const now = new Date();
    const guestsToForfeit: string[] = [];

    for (const guest of guests) {
        const event = (guest as any).events;
        if (!event) continue;

        const eventEnded = event.status === 'ended' || event.status === 'archived';
        const endDatePassed = event.end_date && new Date(event.end_date) < now;

        // Add 1 hour grace period after event ends
        if (eventEnded || endDatePassed) {
            const gracePeriodMs = 60 * 60 * 1000; // 1 hour
            const endDate = event.end_date ? new Date(event.end_date) : new Date();
            const gracePeriodEnded = (now.getTime() - endDate.getTime()) > gracePeriodMs;

            if (gracePeriodEnded) {
                guestsToForfeit.push(guest.id);
            }
        }
    }

    return guestsToForfeit;
}

/**
 * Batch forfeit multiple guests (for no-show processing).
 */
export async function batchForfeit(
    guestIds: string[],
    reason: string
): Promise<{ succeeded: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const guestId of guestIds) {
        try {
            await transitionTicketStatus({
                guestId,
                targetStatus: 'forfeited',
                triggeredBy: 'system',
                reason,
            });
            succeeded++;
        } catch (error) {
            failed++;
            if (error instanceof TicketTransitionError) {
                errors.push(`${guestId}: ${error.message}`);
            } else {
                errors.push(`${guestId}: Unknown error`);
            }
        }
    }

    return { succeeded, failed, errors };
}
