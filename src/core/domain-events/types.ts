/**
 * Domain Event Types (V3)
 * 
 * First-class domain event definitions with versioning.
 * These are the canonical events in the system.
 */

// ============================================================================
// Core Types
// ============================================================================

export type AggregateType = 'event' | 'ticket' | 'payment' | 'calendar' | 'user';

export interface DomainEventBase<T extends string = string, P = unknown> {
    readonly type: T;
    readonly payload: P;
}

export interface DomainEventEnvelope<E extends DomainEventBase = DomainEventBase> {
    readonly id: string;
    readonly aggregateType: AggregateType;
    readonly aggregateId: string;
    readonly event: E;
    readonly version: number;
    readonly metadata: EventMetadata;
}

export interface EventMetadata {
    readonly correlationId: string;
    readonly causationId?: string;
    readonly requestId?: string;
    readonly actor: EventActor;
    readonly occurredAt: string;
    readonly createdAt?: string;
}

export interface EventActor {
    readonly type: 'user' | 'system' | 'cron' | 'webhook';
    readonly id?: string;
}

// ============================================================================
// Event Definitions
// ============================================================================

// --- Event Aggregate ---
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

export interface EventArchivedPayload {
    eventId: string;
}

export interface EventCancelledPayload {
    eventId: string;
    reason: string;
    cancelledBy: string;
}

// --- Ticket Aggregate ---
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
    txHash: string;
    chain?: string;
    currency?: string;
    walletAddress?: string;
}

export interface TicketCheckedInPayload {
    guestId: string;
    eventId: string;
    checkedInAt: string;
    checkedInBy?: string;
}

export interface TicketForfeitedPayload {
    guestId: string;
    eventId: string;
    amount: number;
    reason: string;
}

export interface TicketRefundedPayload {
    guestId: string;
    eventId: string;
    amount: number;
    txHash?: string;
}

// --- Payment Aggregate ---
export interface PaymentReceivedPayload {
    orderId: string;
    guestId: string;
    eventId: string;
    amount: number;
    currency: string;
    method: 'crypto' | 'fiat';
}

export interface EscrowReleasedPayload {
    guestId: string;
    eventId: string;
    amount: number;
    txHash: string;
}

// ============================================================================
// Event Union Types
// ============================================================================

export type EventAggregateEvent =
    | DomainEventBase<'EVENT_PUBLISHED', EventPublishedPayload>
    | DomainEventBase<'EVENT_STARTED', EventStartedPayload>
    | DomainEventBase<'EVENT_ENDED', EventEndedPayload>
    | DomainEventBase<'EVENT_ARCHIVED', EventArchivedPayload>
    | DomainEventBase<'EVENT_CANCELLED', EventCancelledPayload>;

export type TicketAggregateEvent =
    | DomainEventBase<'TICKET_APPROVED', TicketApprovedPayload>
    | DomainEventBase<'TICKET_REJECTED', TicketRejectedPayload>
    | DomainEventBase<'TICKET_STAKED', TicketStakedPayload>
    | DomainEventBase<'TICKET_CHECKED_IN', TicketCheckedInPayload>
    | DomainEventBase<'TICKET_FORFEITED', TicketForfeitedPayload>
    | DomainEventBase<'TICKET_REFUNDED', TicketRefundedPayload>;

export type PaymentAggregateEvent =
    | DomainEventBase<'PAYMENT_RECEIVED', PaymentReceivedPayload>
    | DomainEventBase<'ESCROW_RELEASED', EscrowReleasedPayload>;

export type DomainEvent =
    | EventAggregateEvent
    | TicketAggregateEvent
    | PaymentAggregateEvent;

// ============================================================================
// Event Type Guards
// ============================================================================

export function isEventAggregate(event: DomainEvent): event is EventAggregateEvent {
    return event.type.startsWith('EVENT_');
}

export function isTicketAggregate(event: DomainEvent): event is TicketAggregateEvent {
    return event.type.startsWith('TICKET_');
}

export function isPaymentAggregate(event: DomainEvent): event is PaymentAggregateEvent {
    return event.type.startsWith('PAYMENT_') || event.type.startsWith('ESCROW_');
}

// ============================================================================
// Helper: Extract Aggregate Info
// ============================================================================

export function extractAggregate(event: DomainEvent): {
    aggregateType: AggregateType;
    aggregateId: string;
} {
    const payload = event.payload as unknown as Record<string, unknown>;

    if (isEventAggregate(event)) {
        return { aggregateType: 'event', aggregateId: payload.eventId as string };
    }
    if (isTicketAggregate(event)) {
        return { aggregateType: 'ticket', aggregateId: payload.guestId as string };
    }
    if (isPaymentAggregate(event)) {
        return { aggregateType: 'payment', aggregateId: (payload.orderId || payload.guestId) as string };
    }

    return { aggregateType: 'event', aggregateId: '' };
}
