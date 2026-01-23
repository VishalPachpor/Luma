/**
 * Event Bus
 * 
 * Central event emitter for the domain event architecture.
 * Logs events to database and dispatches to Inngest for async processing.
 */

import { inngest } from '@/inngest/client';
import { getServiceSupabase } from '@/lib/supabase';
import type { DomainEvent, EventMetadata, DomainEventEnvelope } from './domain-events';

// ============================================================================
// Event Bus
// ============================================================================

/**
 * Emit a domain event.
 * 
 * This:
 * 1. Logs the event to the event_log table (event sourcing lite)
 * 2. Sends to Inngest for async consumer processing
 */
export async function emit<T extends DomainEvent>(
    event: T,
    metadata?: Partial<EventMetadata>
): Promise<string> {
    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const fullMetadata: EventMetadata = {
        correlationId: metadata?.correlationId || crypto.randomUUID(),
        causationId: metadata?.causationId,
        actor: metadata?.actor || { type: 'system' },
        timestamp,
    };

    const envelope: DomainEventEnvelope<T> = {
        id: eventId,
        event,
        metadata: fullMetadata,
    };

    // 1. Log to event_log table
    await logEventToDatabase(envelope);

    // 2. Dispatch to Inngest for async processing
    await dispatchToInngest(envelope);

    console.log(`[EventBus] Emitted ${event.type}`, { eventId, correlationId: fullMetadata.correlationId });

    return eventId;
}

/**
 * Emit multiple events in a single transaction
 */
export async function emitBatch(
    events: DomainEvent[],
    metadata?: Partial<EventMetadata>
): Promise<string[]> {
    const correlationId = metadata?.correlationId || crypto.randomUUID();
    const eventIds: string[] = [];

    for (const event of events) {
        const id = await emit(event, { ...metadata, correlationId });
        eventIds.push(id);
    }

    return eventIds;
}

// ============================================================================
// Internal Functions
// ============================================================================

function extractAggregate(event: DomainEvent): { aggregateType: string; aggregateId: string } {
    const payload = event.payload as Record<string, unknown>;

    if (payload.eventId) {
        return { aggregateType: 'event', aggregateId: payload.eventId as string };
    }
    if (payload.guestId) {
        return { aggregateType: 'ticket', aggregateId: payload.guestId as string };
    }
    if (payload.orderId) {
        return { aggregateType: 'payment', aggregateId: payload.orderId as string };
    }

    return { aggregateType: 'unknown', aggregateId: '' };
}

async function logEventToDatabase(envelope: DomainEventEnvelope): Promise<void> {
    const supabase = getServiceSupabase();
    const { aggregateType, aggregateId } = extractAggregate(envelope.event);

    const { error } = await supabase.from('event_log').insert({
        id: envelope.id,
        event_type: envelope.event.type,
        payload: envelope.event.payload,
        correlation_id: envelope.metadata.correlationId,
        causation_id: envelope.metadata.causationId,
        actor_type: envelope.metadata.actor.type,
        actor_id: envelope.metadata.actor.id,
        created_at: envelope.metadata.timestamp,
        // New aggregate columns
        aggregate_type: aggregateType,
        aggregate_id: aggregateId,
    });

    if (error) {
        console.error('[EventBus] Failed to log event:', error);
        // Don't throw - we still want to dispatch to Inngest
    }
}

async function dispatchToInngest(envelope: DomainEventEnvelope): Promise<void> {
    try {
        await inngest.send({
            name: `app/${envelope.event.type.toLowerCase()}`,
            data: {
                ...envelope.event.payload,
                _metadata: envelope.metadata,
            },
        });
    } catch (error) {
        console.error('[EventBus] Failed to dispatch to Inngest:', error);
        throw error;
    }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all events for an entity (event sourcing query)
 */
export async function getEntityEvents(
    entityType: 'event' | 'ticket' | 'payment',
    entityId: string
): Promise<DomainEventEnvelope[]> {
    const supabase = getServiceSupabase();

    // Determine which field to query based on entity type
    const idField = entityType === 'event' ? 'eventId' :
        entityType === 'ticket' ? 'guestId' : 'orderId';

    const { data, error } = await supabase
        .from('event_log')
        .select('*')
        .contains('payload', { [idField]: entityId })
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[EventBus] Query failed:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        event: {
            type: row.event_type,
            payload: row.payload,
        } as DomainEvent,
        metadata: {
            correlationId: row.correlation_id,
            causationId: row.causation_id,
            actor: { type: row.actor_type, id: row.actor_id },
            timestamp: row.created_at,
        },
    }));
}

/**
 * Get events by correlation ID (transaction tracing)
 */
export async function getCorrelatedEvents(correlationId: string): Promise<DomainEventEnvelope[]> {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
        .from('event_log')
        .select('*')
        .eq('correlation_id', correlationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[EventBus] Query failed:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        event: {
            type: row.event_type,
            payload: row.payload,
        } as DomainEvent,
        metadata: {
            correlationId: row.correlation_id,
            causationId: row.causation_id,
            actor: { type: row.actor_type, id: row.actor_id },
            timestamp: row.created_at,
        },
    }));
}
