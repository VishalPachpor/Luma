/**
 * Domain Event Store (V3)
 * 
 * Append-only event store with versioning and optimistic concurrency.
 * This is the canonical source of truth for what happened in the system.
 */

import { getServiceSupabase } from '@/lib/supabase';
import { inngest } from '@/inngest/client';
import type {
    DomainEvent,
    DomainEventEnvelope,
    EventMetadata,
    AggregateType,
    extractAggregate,
} from './types';
import { extractAggregate as extractAgg } from './types';

// ============================================================================
// Event Store
// ============================================================================

class DomainEventStore {
    /**
     * Append a new event to the store.
     * Automatically handles versioning with optimistic concurrency.
     */
    async append<E extends DomainEvent>(
        event: E,
        metadata: Partial<EventMetadata> = {}
    ): Promise<DomainEventEnvelope<E>> {
        const supabase = getServiceSupabase();
        const { aggregateType, aggregateId } = extractAgg(event);

        // Get next version
        const { data: versionData } = await supabase
            .rpc('get_next_event_version', {
                p_aggregate_type: aggregateType,
                p_aggregate_id: aggregateId,
            });

        const version = versionData || 1;
        const eventId = crypto.randomUUID();
        const now = new Date().toISOString();

        const fullMetadata: EventMetadata = {
            correlationId: metadata.correlationId || crypto.randomUUID(),
            causationId: metadata.causationId,
            requestId: metadata.requestId,
            actor: metadata.actor || { type: 'system' },
            occurredAt: metadata.occurredAt || now,
        };

        const envelope: DomainEventEnvelope<E> = {
            id: eventId,
            aggregateType,
            aggregateId,
            event,
            version,
            metadata: fullMetadata,
        };

        // Persist to store
        const { error } = await supabase.from('domain_events').insert({
            id: eventId,
            aggregate_type: aggregateType,
            aggregate_id: aggregateId,
            event_type: event.type,
            payload: event.payload,
            version,
            correlation_id: fullMetadata.correlationId,
            causation_id: fullMetadata.causationId,
            request_id: fullMetadata.requestId,
            actor_type: fullMetadata.actor.type,
            actor_id: fullMetadata.actor.id,
            occurred_at: fullMetadata.occurredAt,
        });

        if (error) {
            // Check for version conflict
            if (error.code === '23505') {
                throw new ConcurrencyError(
                    `Concurrency conflict for ${aggregateType}:${aggregateId} at version ${version}`
                );
            }
            throw new EventStoreError(`Failed to append event: ${error.message}`);
        }

        // Dispatch to Inngest for async processing
        await this.dispatch(envelope);

        console.log(`[EventStore] Appended ${event.type} v${version} to ${aggregateType}:${aggregateId}`);

        return envelope;
    }

    /**
     * Get all events for an aggregate (in order).
     */
    async getStream(
        aggregateType: AggregateType,
        aggregateId: string,
        fromVersion: number = 0
    ): Promise<DomainEventEnvelope[]> {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('domain_events')
            .select('*')
            .eq('aggregate_type', aggregateType)
            .eq('aggregate_id', aggregateId)
            .gt('version', fromVersion)
            .order('version', { ascending: true });

        if (error) {
            throw new EventStoreError(`Failed to get stream: ${error.message}`);
        }

        return (data || []).map(this.rowToEnvelope);
    }

    /**
     * Get events by correlation ID (transaction tracing).
     */
    async getByCorrelation(correlationId: string): Promise<DomainEventEnvelope[]> {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('domain_events')
            .select('*')
            .eq('correlation_id', correlationId)
            .order('occurred_at', { ascending: true });

        if (error) {
            throw new EventStoreError(`Failed to get by correlation: ${error.message}`);
        }

        return (data || []).map(this.rowToEnvelope);
    }

    /**
     * Get recent events (for replay/recovery).
     */
    async getRecent(
        limit: number = 100,
        eventTypes?: string[]
    ): Promise<DomainEventEnvelope[]> {
        const supabase = getServiceSupabase();

        let query = supabase
            .from('domain_events')
            .select('*')
            .order('occurred_at', { ascending: false })
            .limit(limit);

        if (eventTypes && eventTypes.length > 0) {
            query = query.in('event_type', eventTypes);
        }

        const { data, error } = await query;

        if (error) {
            throw new EventStoreError(`Failed to get recent: ${error.message}`);
        }

        return (data || []).map(this.rowToEnvelope);
    }

    // =========================================================================
    // Internal
    // =========================================================================

    private async dispatch(envelope: DomainEventEnvelope): Promise<void> {
        try {
            await inngest.send({
                name: `app/${envelope.event.type.toLowerCase()}`,
                data: {
                    ...(envelope.event.payload as object),
                    _envelope: {
                        id: envelope.id,
                        version: envelope.version,
                        aggregateType: envelope.aggregateType,
                        aggregateId: envelope.aggregateId,
                    },
                    _metadata: envelope.metadata,
                },
            });
        } catch (error) {
            console.error('[EventStore] Failed to dispatch:', error);
            throw error;
        }
    }

    private rowToEnvelope(row: any): DomainEventEnvelope {
        return {
            id: row.id,
            aggregateType: row.aggregate_type,
            aggregateId: row.aggregate_id,
            event: {
                type: row.event_type,
                payload: row.payload,
            } as DomainEvent,
            version: row.version,
            metadata: {
                correlationId: row.correlation_id,
                causationId: row.causation_id,
                requestId: row.request_id,
                actor: { type: row.actor_type, id: row.actor_id },
                occurredAt: row.occurred_at,
                createdAt: row.created_at,
            },
        };
    }
}

// ============================================================================
// Errors
// ============================================================================

export class EventStoreError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'EventStoreError';
    }
}

export class ConcurrencyError extends EventStoreError {
    constructor(message: string) {
        super(message);
        this.name = 'ConcurrencyError';
    }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const eventStore = new DomainEventStore();
