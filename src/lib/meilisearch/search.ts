/**
 * Meilisearch Search Service
 * 
 * Federated search with Meilisearch, falling back to PostgreSQL.
 */

import {
    getMeilisearchClient,
    getIndex,
    isMeilisearchAvailable,
    INDEXES,
    EventDocument,
    CalendarDocument,
    UserDocument,
} from './client';
import { getServiceSupabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

export interface SearchResult<T> {
    hits: T[];
    totalHits: number;
    query: string;
    processingTimeMs: number;
}

export interface FederatedSearchResults {
    events: SearchResult<EventDocument>;
    calendars: SearchResult<CalendarDocument>;
    users: SearchResult<UserDocument>;
    source: 'meilisearch' | 'postgres';
}

// ============================================================================
// Federated Search
// ============================================================================

/**
 * Search across all indexes (events, calendars, users)
 */
export async function federatedSearch(
    query: string,
    options: {
        limit?: number;
        filters?: {
            city?: string;
            status?: string;
            visibility?: string;
        };
    } = {}
): Promise<FederatedSearchResults> {
    const { limit = 10, filters } = options;

    // Try Meilisearch first
    const isAvailable = await isMeilisearchAvailable();

    if (isAvailable) {
        return federatedSearchMeilisearch(query, limit, filters);
    }

    // Fallback to PostgreSQL
    return federatedSearchPostgres(query, limit, filters);
}

/**
 * Meilisearch federated search
 */
async function federatedSearchMeilisearch(
    query: string,
    limit: number,
    filters?: Record<string, string>
): Promise<FederatedSearchResults> {
    const client = getMeilisearchClient()!;
    const startTime = Date.now();

    // Build filter string
    let filterStr = 'visibility = "public"';
    if (filters?.city) filterStr += ` AND city = "${filters.city}"`;
    if (filters?.status) filterStr += ` AND status = "${filters.status}"`;

    // Multi-search
    const results = await client.multiSearch({
        queries: [
            {
                indexUid: INDEXES.events,
                q: query,
                limit,
                filter: filterStr,
            },
            {
                indexUid: INDEXES.calendars,
                q: query,
                limit,
                filter: 'visibility = "public"',
            },
            {
                indexUid: INDEXES.users,
                q: query,
                limit,
            },
        ],
    });

    const processingTime = Date.now() - startTime;

    return {
        events: {
            hits: results.results[0].hits as EventDocument[],
            totalHits: results.results[0].estimatedTotalHits || 0,
            query,
            processingTimeMs: processingTime,
        },
        calendars: {
            hits: results.results[1].hits as CalendarDocument[],
            totalHits: results.results[1].estimatedTotalHits || 0,
            query,
            processingTimeMs: processingTime,
        },
        users: {
            hits: results.results[2].hits as UserDocument[],
            totalHits: results.results[2].estimatedTotalHits || 0,
            query,
            processingTimeMs: processingTime,
        },
        source: 'meilisearch',
    };
}

/**
 * PostgreSQL fallback search
 */
async function federatedSearchPostgres(
    query: string,
    limit: number,
    filters?: Record<string, string>
): Promise<FederatedSearchResults> {
    const supabase = getServiceSupabase();
    const startTime = Date.now();

    // Use existing search_global RPC
    const { data: searchResults } = await supabase.rpc('search_global', {
        query_text: query,
    });

    const processingTime = Date.now() - startTime;

    // Group by entity type
    const events: EventDocument[] = [];
    const calendars: CalendarDocument[] = [];
    const users: UserDocument[] = [];

    for (const result of (searchResults || [])) {
        if (result.entity_type === 'event' && events.length < limit) {
            events.push({
                id: result.entity_id,
                title: result.title || '',
                description: result.description || '',
                location: '',
                city: '',
                tags: [],
                organizer: '',
                organizerId: '',
                date: 0,
                status: 'published',
                visibility: 'public',
                attendees: 0,
                createdAt: Date.now(),
            });
        } else if (result.entity_type === 'calendar' && calendars.length < limit) {
            calendars.push({
                id: result.entity_id,
                name: result.title || '',
                description: result.description || '',
                tags: [],
                ownerId: '',
                visibility: 'public',
                followerCount: 0,
                createdAt: Date.now(),
            });
        } else if (result.entity_type === 'user' && users.length < limit) {
            users.push({
                id: result.entity_id,
                displayName: result.title || '',
                username: '',
                createdAt: Date.now(),
            });
        }
    }

    return {
        events: { hits: events, totalHits: events.length, query, processingTimeMs: processingTime },
        calendars: { hits: calendars, totalHits: calendars.length, query, processingTimeMs: processingTime },
        users: { hits: users, totalHits: users.length, query, processingTimeMs: processingTime },
        source: 'postgres',
    };
}

// ============================================================================
// Single Index Search
// ============================================================================

/**
 * Search events only
 */
export async function searchEvents(
    query: string,
    options: {
        limit?: number;
        city?: string;
        status?: string;
    } = {}
): Promise<SearchResult<EventDocument>> {
    const { limit = 20, city, status } = options;

    const isAvailable = await isMeilisearchAvailable();

    if (isAvailable) {
        const index = getIndex(INDEXES.events)!;

        let filter = 'visibility = "public"';
        if (city) filter += ` AND city = "${city}"`;
        if (status) filter += ` AND status = "${status}"`;

        const result = await index.search<EventDocument>(query, {
            limit,
            filter,
            sort: ['date:asc'],
        });

        return {
            hits: result.hits,
            totalHits: result.estimatedTotalHits || 0,
            query,
            processingTimeMs: result.processingTimeMs,
        };
    }

    // Fallback to basic search
    const supabase = getServiceSupabase();
    const { data } = await supabase
        .from('events')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('visibility', 'public')
        .limit(limit);

    return {
        hits: (data || []).map(e => ({
            id: e.id,
            title: e.title,
            description: e.description || '',
            location: e.location || '',
            city: e.city || '',
            tags: e.tags || [],
            organizer: e.organizer_name || '',
            organizerId: e.organizer_id,
            date: new Date(e.date).getTime(),
            status: e.status,
            visibility: e.visibility,
            attendees: e.attendee_count || 0,
            coverImage: e.cover_image,
            createdAt: new Date(e.created_at).getTime(),
        })),
        totalHits: (data || []).length,
        query,
        processingTimeMs: 0,
    };
}
