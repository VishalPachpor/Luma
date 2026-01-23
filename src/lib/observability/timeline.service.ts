/**
 * Timeline Service
 * 
 * Entity timeline reconstruction for debugging and auditing.
 * Queries the event_log to show everything that happened to an entity.
 */

import { getServiceSupabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

export interface TimelineEntry {
    id: string;
    eventType: string;
    payload: Record<string, unknown>;
    actor: {
        type: string;
        id?: string;
    };
    correlationId: string;
    causationId?: string;
    timestamp: string;
    relativeTime?: string;
}

export interface EntityTimeline {
    entityId: string;
    entityType: string;
    entries: TimelineEntry[];
    firstEvent?: string;
    lastEvent?: string;
    totalEvents: number;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get complete timeline for an entity
 */
export async function getEntityTimeline(
    entityType: 'event' | 'ticket' | 'payment',
    entityId: string
): Promise<EntityTimeline> {
    const supabase = getServiceSupabase();

    // Determine which payload field to query
    const idField = entityType === 'event' ? 'eventId' :
        entityType === 'ticket' ? 'guestId' : 'orderId';

    const { data, error } = await supabase
        .from('event_log')
        .select('*')
        .or(`payload->>${idField}.eq.${entityId}`)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[Timeline] Query failed:', error);
        return {
            entityId,
            entityType,
            entries: [],
            totalEvents: 0,
        };
    }

    const entries: TimelineEntry[] = (data || []).map(row => ({
        id: row.id,
        eventType: row.event_type,
        payload: row.payload,
        actor: { type: row.actor_type, id: row.actor_id },
        correlationId: row.correlation_id,
        causationId: row.causation_id,
        timestamp: row.created_at,
        relativeTime: getRelativeTime(row.created_at),
    }));

    return {
        entityId,
        entityType,
        entries,
        firstEvent: entries[0]?.timestamp,
        lastEvent: entries[entries.length - 1]?.timestamp,
        totalEvents: entries.length,
    };
}

/**
 * Get timeline for a transaction (by correlation ID)
 */
export async function getTransactionTimeline(correlationId: string): Promise<TimelineEntry[]> {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
        .from('event_log')
        .select('*')
        .eq('correlation_id', correlationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[Timeline] Query failed:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        eventType: row.event_type,
        payload: row.payload,
        actor: { type: row.actor_type, id: row.actor_id },
        correlationId: row.correlation_id,
        causationId: row.causation_id,
        timestamp: row.created_at,
        relativeTime: getRelativeTime(row.created_at),
    }));
}

/**
 * Get recent events across all entities (admin view)
 */
export async function getRecentEvents(
    limit: number = 100,
    eventTypes?: string[]
): Promise<TimelineEntry[]> {
    const supabase = getServiceSupabase();

    let query = supabase
        .from('event_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (eventTypes && eventTypes.length > 0) {
        query = query.in('event_type', eventTypes);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[Timeline] Query failed:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        eventType: row.event_type,
        payload: row.payload,
        actor: { type: row.actor_type, id: row.actor_id },
        correlationId: row.correlation_id,
        causationId: row.causation_id,
        timestamp: row.created_at,
        relativeTime: getRelativeTime(row.created_at),
    }));
}

/**
 * Get failed/problematic events (tickets that didn't complete check-in, etc.)
 */
export async function getIncompleteTransactions(
    since: Date,
    limit: number = 50
): Promise<{
    correlationId: string;
    startedAt: string;
    lastEventType: string;
    entityId?: string;
    events: TimelineEntry[];
}[]> {
    const supabase = getServiceSupabase();

    // Get staked tickets that never checked in
    const { data: stakedEvents } = await supabase
        .from('event_log')
        .select('*')
        .eq('event_type', 'TICKET_STAKED')
        .gte('created_at', since.toISOString())
        .limit(limit);

    const incomplete: any[] = [];

    for (const stakedEvent of stakedEvents || []) {
        // Check if there's a TICKET_CHECKED_IN for same guest
        const guestId = stakedEvent.payload?.guestId;
        if (!guestId) continue;

        const { data: checkedIn } = await supabase
            .from('event_log')
            .select('id')
            .eq('event_type', 'TICKET_CHECKED_IN')
            .contains('payload', { guestId })
            .limit(1);

        if (!checkedIn || checkedIn.length === 0) {
            // This is an incomplete transaction
            const timeline = await getTransactionTimeline(stakedEvent.correlation_id);

            incomplete.push({
                correlationId: stakedEvent.correlation_id,
                startedAt: stakedEvent.created_at,
                lastEventType: timeline[timeline.length - 1]?.eventType,
                entityId: guestId,
                events: timeline,
            });
        }
    }

    return incomplete;
}

// ============================================================================
// Helpers
// ============================================================================

function getRelativeTime(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
}
