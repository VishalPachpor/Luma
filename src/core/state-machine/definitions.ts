/**
 * State Machine Definitions (V3)
 * 
 * Declarative definitions of all entity state machines.
 * Single source of truth for valid transitions.
 */

// ============================================================================
// Event Lifecycle
// ============================================================================

export const EventStates = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    LIVE: 'live',
    ENDED: 'ended',
    ARCHIVED: 'archived',
    CANCELLED: 'cancelled',
} as const;

export type EventStatus = typeof EventStates[keyof typeof EventStates];

export const EventStateMachine = {
    [EventStates.DRAFT]: {
        publish: EventStates.PUBLISHED,
        archive: EventStates.ARCHIVED,
    },
    [EventStates.PUBLISHED]: {
        start: EventStates.LIVE,
        cancel: EventStates.CANCELLED,
        archive: EventStates.ARCHIVED,
        draft: EventStates.DRAFT, // Unpublish
    },
    [EventStates.LIVE]: {
        end: EventStates.ENDED,
        cancel: EventStates.CANCELLED,
    },
    [EventStates.ENDED]: {
        archive: EventStates.ARCHIVED,
    },
    [EventStates.ARCHIVED]: {
        // Terminal state (mostly)
        draft: EventStates.DRAFT, // Restore
    },
    [EventStates.CANCELLED]: {
        archive: EventStates.ARCHIVED,
    },
} as const;

// ============================================================================
// Ticket Lifecycle
// ============================================================================

export const TicketStates = {
    PENDING: 'pending',
    PENDING_APPROVAL: 'pending_approval',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    ISSUED: 'issued',
    STAKED: 'staked',
    CHECKED_IN: 'checked_in',
    SCANNED: 'scanned',
    FORFEITED: 'forfeited',
    REFUNDED: 'refunded',
    REVOKED: 'revoked',
    CANCELLED: 'cancelled',
} as const;

export type TicketStatus = typeof TicketStates[keyof typeof TicketStates];

export const TicketStateMachine = {
    [TicketStates.PENDING]: {
        request_approval: TicketStates.PENDING_APPROVAL,
        issue: TicketStates.ISSUED,          // Free registration, no approval
        cancel: TicketStates.CANCELLED,
    },
    [TicketStates.PENDING_APPROVAL]: {
        approve: TicketStates.APPROVED,
        reject: TicketStates.REJECTED,
    },
    [TicketStates.APPROVED]: {
        stake: TicketStates.STAKED,
        issue: TicketStates.ISSUED,          // Free event after approval
        revoke: TicketStates.REVOKED,
        cancel: TicketStates.CANCELLED,
    },
    [TicketStates.ISSUED]: {
        check_in: TicketStates.CHECKED_IN,
        scan: TicketStates.SCANNED,          // Legacy check-in
        revoke: TicketStates.REVOKED,
    },
    [TicketStates.STAKED]: {
        check_in: TicketStates.CHECKED_IN,
        scan: TicketStates.SCANNED,          // Legacy check-in
        refund: TicketStates.REFUNDED,
        forfeit: TicketStates.FORFEITED,
        cancel: TicketStates.REFUNDED,       // Cancelled staked ticket = refund
    },
    [TicketStates.CHECKED_IN]: {
        // Terminal
    },
    [TicketStates.SCANNED]: {
        // Terminal (legacy, same as checked_in)
    },
    [TicketStates.REJECTED]: {
        // Terminal
    },
    [TicketStates.FORFEITED]: {
        // Terminal
    },
    [TicketStates.REFUNDED]: {
        // Terminal
    },
    [TicketStates.REVOKED]: {
        // Terminal
    },
    [TicketStates.CANCELLED]: {
        // Terminal
    },
} as const;
