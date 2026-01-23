/**
 * Meilisearch Client Configuration
 * 
 * External search engine for fast, typo-tolerant federated search.
 * Falls back to existing PostgreSQL search if Meilisearch is not configured.
 */

import { MeiliSearch, Index } from 'meilisearch';

// ============================================================================
// Configuration
// ============================================================================

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || '';

// Index names
export const INDEXES = {
    events: 'events',
    calendars: 'calendars',
    users: 'users',
} as const;

export type IndexName = typeof INDEXES[keyof typeof INDEXES];

// ============================================================================
// Client
// ============================================================================

let client: MeiliSearch | null = null;

/**
 * Get Meilisearch client (singleton)
 */
export function getMeilisearchClient(): MeiliSearch | null {
    if (!MEILISEARCH_API_KEY) {
        console.warn('[Meilisearch] No API key configured, search will use PostgreSQL fallback');
        return null;
    }

    if (!client) {
        client = new MeiliSearch({
            host: MEILISEARCH_HOST,
            apiKey: MEILISEARCH_API_KEY,
        });
    }

    return client;
}

/**
 * Check if Meilisearch is available
 */
export async function isMeilisearchAvailable(): Promise<boolean> {
    const client = getMeilisearchClient();
    if (!client) return false;

    try {
        await client.health();
        return true;
    } catch {
        return false;
    }
}

/**
 * Get an index by name
 */
export function getIndex(name: IndexName): Index | null {
    const client = getMeilisearchClient();
    if (!client) return null;
    return client.index(name);
}

// ============================================================================
// Index Configuration
// ============================================================================

/**
 * Configure index settings (run once on setup)
 */
export async function configureIndexes(): Promise<void> {
    const client = getMeilisearchClient();
    if (!client) return;

    // Events index
    const eventsIndex = client.index(INDEXES.events);
    await eventsIndex.updateSettings({
        searchableAttributes: ['title', 'description', 'location', 'city', 'tags', 'organizer'],
        filterableAttributes: ['city', 'status', 'visibility', 'calendarId', 'date'],
        sortableAttributes: ['date', 'attendees', 'createdAt'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
    });

    // Calendars index
    const calendarsIndex = client.index(INDEXES.calendars);
    await calendarsIndex.updateSettings({
        searchableAttributes: ['name', 'description', 'tags'],
        filterableAttributes: ['visibility', 'ownerId'],
        sortableAttributes: ['createdAt', 'followerCount'],
    });

    // Users index
    const usersIndex = client.index(INDEXES.users);
    await usersIndex.updateSettings({
        searchableAttributes: ['displayName', 'username', 'bio'],
        filterableAttributes: [],
        sortableAttributes: ['createdAt'],
    });

    console.log('[Meilisearch] Indexes configured');
}

// ============================================================================
// Document Types
// ============================================================================

export interface EventDocument {
    id: string;
    title: string;
    description: string;
    location: string;
    city: string;
    tags: string[];
    organizer: string;
    organizerId: string;
    calendarId?: string;
    date: number; // Unix timestamp
    status: string;
    visibility: string;
    attendees: number;
    coverImage?: string;
    createdAt: number;
}

export interface CalendarDocument {
    id: string;
    name: string;
    description: string;
    tags: string[];
    ownerId: string;
    visibility: string;
    followerCount: number;
    createdAt: number;
}

export interface UserDocument {
    id: string;
    displayName: string;
    username: string;
    bio?: string;
    photoURL?: string;
    createdAt: number;
}
