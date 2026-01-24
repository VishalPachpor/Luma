/**
 * Domain Events
 * 
 * Canonical event definitions for the Lumma event-driven architecture.
 * These events are the contract between services.
 */

// ============================================================================
// Event Types
// ============================================================================

export type DomainEventType =
    // Event Lifecycle
    | 'EVENT_CREATED'
    | 'EVENT_PUBLISHED'
    | 'EVENT_STARTED'
    | 'EVENT_ENDED'
    | 'EVENT_ARCHIVED'
    // Ticket Lifecycle
    | 'TICKET_REGISTERED'
    | 'TICKET_APPROVED'
    | 'TICKET_REJECTED'
    | 'TICKET_STAKED'
    | 'TICKET_CHECKED_IN'
    | 'TICKET_REFUNDED'
    | 'TICKET_FORFEITED'
    | 'TICKET_REVOKED'
    // Payment
    | 'PAYMENT_RECEIVED'
    | 'PAYMENT_RELEASED'
    | 'PAYMENT_REFUNDED'
    // User Actions
    | 'USER_REGISTERED'
    | 'CALENDAR_FOLLOWED'
    | 'INVITE_SENT';

// ============================================================================
// Event Payloads
// ============================================================================

export interface EventCreatedPayload {
    eventId: string;
    organizerId: string;
    calendarId?: string;
    title: string;
}

export interface EventPublishedPayload {
    eventId: string;
    scheduledStartAt?: string;
    scheduledEndAt?: string;
}

export interface EventStartedPayload {
    eventId: string;
}

export interface EventEndedPayload {
    eventId: string;
    attendeeCount: number;
    checkedInCount: number;
}

export interface TicketRegisteredPayload {
    guestId: string;
    eventId: string;
    userId: string;
    requiresApproval: boolean;
}

export interface TicketApprovedPayload {
    guestId: string;
    eventId: string;
    approvedBy: string;
}

export interface TicketRejectedPayload {
    guestId: string;
    eventId: string;
    rejectedBy: string;
    reason?: string;
}

export interface TicketStakedPayload {
    guestId: string;
    eventId: string;
    amount: number;
    currency: string;
    txHash: string;
    walletAddress: string;
}

export interface TicketCheckedInPayload {
    guestId: string;
    eventId: string;
    checkedInAt: string;
    checkedInBy?: string;
}

export interface TicketRefundedPayload {
    guestId: string;
    eventId: string;
    amount: number;
    txHash?: string;
}

export interface TicketForfeitedPayload {
    guestId: string;
    eventId: string;
    amount: number;
    reason: string;
}

export interface PaymentReceivedPayload {
    orderId: string;
    eventId: string;
    userId: string;
    amount: number;
    currency: string;
    provider: 'stripe' | 'crypto';
}

// ============================================================================
// Domain Event Union
// ============================================================================

export type DomainEvent =
    | { type: 'EVENT_CREATED'; payload: EventCreatedPayload }
    | { type: 'EVENT_PUBLISHED'; payload: EventPublishedPayload }
    | { type: 'EVENT_STARTED'; payload: EventStartedPayload }
    | { type: 'EVENT_ENDED'; payload: EventEndedPayload }
    | { type: 'EVENT_ARCHIVED'; payload: { eventId: string } }
    | { type: 'TICKET_REGISTERED'; payload: TicketRegisteredPayload }
    | { type: 'TICKET_APPROVED'; payload: TicketApprovedPayload }
    | { type: 'TICKET_REJECTED'; payload: TicketRejectedPayload }
    | { type: 'TICKET_STAKED'; payload: TicketStakedPayload }
    | { type: 'TICKET_CHECKED_IN'; payload: TicketCheckedInPayload }
    | { type: 'TICKET_REFUNDED'; payload: TicketRefundedPayload }
    | { type: 'TICKET_FORFEITED'; payload: TicketForfeitedPayload }
    | { type: 'PAYMENT_RECEIVED'; payload: PaymentReceivedPayload }
    | { type: 'PAYMENT_RELEASED'; payload: { guestId: string; txHash: string } }
    | { type: 'PAYMENT_REFUNDED'; payload: { guestId: string; txHash: string } };

// ============================================================================
// Event Metadata
// ============================================================================

export interface EventMetadata {
    correlationId: string;  // Groups related events (e.g., full transaction)
    causationId?: string;   // Event that triggered this one
    actor: {
        type: 'user' | 'system' | 'cron' | 'webhook';
        id?: string;
    };
    timestamp: string;
}

export interface DomainEventEnvelope<T extends DomainEvent = DomainEvent> {
    id: string;
    event: T;
    metadata: EventMetadata;
}
