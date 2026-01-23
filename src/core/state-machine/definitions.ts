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
    APPROVED: 'approved',
    REJECTED: 'rejected',
    STAKED: 'staked',
    CHECKED_IN: 'checked_in',
    FORFEITED: 'forfeited',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled',
} as const;

export type TicketStatus = typeof TicketStates[keyof typeof TicketStates];

export const TicketStateMachine = {
    [TicketStates.PENDING]: {
        approve: TicketStates.APPROVED,
        reject: TicketStates.REJECTED,
        cancel: TicketStates.CANCELLED,
    },
    [TicketStates.APPROVED]: {
        stake: TicketStates.STAKED,
        cancel: TicketStates.CANCELLED,
        reject: TicketStates.REJECTED, // Revoke
    },
    [TicketStates.STAKED]: {
        check_in: TicketStates.CHECKED_IN,
        refund: TicketStates.REFUNDED,
        forfeit: TicketStates.FORFEITED,
        cancel: TicketStates.REFUNDED, // Cancelled staked ticket = refund
    },
    [TicketStates.CHECKED_IN]: {
        // Terminal
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
    [TicketStates.CANCELLED]: {
        // Terminal
    },
} as const;
