/**
 * Observability Tracing (V3)
 * 
 * Helper for visualizing correlation trees and event flows.
 * Uses domain_events as the source of truth for causal history.
 */

import { eventStore } from '@/core/domain-events/store';
import type { DomainEventEnvelope } from '@/core/domain-events/types';

// ============================================================================
// Types
// ============================================================================

export interface TraceNode {
    id: string; // Event ID
    type: string; // Event Type
    aggregate: string;
    version: number;
    occurredAt: string;
    actor: string;
    children: TraceNode[];
}

export interface CorrelationTree {
    rootCorrelationId: string;
    nodes: TraceNode[];
    coverage: {
        totalEvents: number;
        aggregates: string[];
    };
}

// ============================================================================
// Tracing Service
// ============================================================================

class ObservabilityTracing {

    /**
     * Build a causal tree for a given correlation ID.
     * Shows how one request spiraled into multiple domain events.
     */
    async getCorrelationTree(correlationId: string): Promise<CorrelationTree> {
        const events = await eventStore.getByCorrelation(correlationId);

        if (events.length === 0) {
            return {
                rootCorrelationId: correlationId,
                nodes: [],
                coverage: { totalEvents: 0, aggregates: [] }
            };
        }

        // Build nodes
        const nodes = events.map(e => this.toNode(e));

        // In a real causal graph, we'd use causationId to nest them.
        // For now, since most share the same correlationId from the root request,
        // we'll return a flat chronological list (impromptu sequence diagram).
        // If we had cross-service hops generating new commands but keeping correlationId,
        // we'd see them here.

        const aggregates = new Set(events.map(e => `${e.aggregateType}:${e.aggregateId}`));

        return {
            rootCorrelationId: correlationId,
            nodes, // Chronological
            coverage: {
                totalEvents: events.length,
                aggregates: Array.from(aggregates)
            }
        };
    }

    private toNode(env: DomainEventEnvelope): TraceNode {
        return {
            id: env.id,
            type: env.event.type,
            aggregate: `${env.aggregateType}:${env.aggregateId}`,
            version: env.version,
            occurredAt: env.metadata.occurredAt,
            actor: `${env.metadata.actor.type}:${env.metadata.actor.id || 'anon'}`,
            children: []
        };
    }
}

export const tracing = new ObservabilityTracing();
