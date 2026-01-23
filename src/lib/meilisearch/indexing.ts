/**
 * Meilisearch Indexing Service
 * 
 * Syncs data from PostgreSQL to Meilisearch indexes.
 */

import {
    getMeilisearchClient,
    getIndex,
    INDEXES,
    EventDocument,
    CalendarDocument,
} from './client';
import { getServiceSupabase } from '@/lib/supabase';

// ============================================================================
// Event Indexing
// ============================================================================

/**
 * Index a single event
 */
export async function indexEvent(eventId: string): Promise<boolean> {
    const index = getIndex(INDEXES.events);
    if (!index) return false;

    const supabase = getServiceSupabase();
    const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (error || !event) {
        console.error('[MeiliIndex] Event not found:', eventId);
        return false;
    }

    const doc: EventDocument = {
        id: event.id,
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        city: event.city || '',
        tags: event.tags || [],
        organizer: event.organizer_name || '',
        organizerId: event.organizer_id,
        calendarId: event.calendar_id,
        date: new Date(event.date).getTime(),
        status: event.status,
        visibility: event.visibility,
        attendees: event.attendee_count || 0,
        coverImage: event.cover_image,
        createdAt: new Date(event.created_at).getTime(),
    };

    try {
        await index.addDocuments([doc]);
        console.log('[MeiliIndex] Indexed event:', eventId);
        return true;
    } catch (error) {
        console.error('[MeiliIndex] Failed to index event:', error);
        return false;
    }
}

/**
 * Remove an event from the index
 */
export async function removeEventFromIndex(eventId: string): Promise<boolean> {
    const index = getIndex(INDEXES.events);
    if (!index) return false;

    try {
        await index.deleteDocument(eventId);
        console.log('[MeiliIndex] Removed event:', eventId);
        return true;
    } catch (error) {
        console.error('[MeiliIndex] Failed to remove event:', error);
        return false;
    }
}

/**
 * Reindex all events
 */
export async function reindexAllEvents(): Promise<{ indexed: number; failed: number }> {
    const index = getIndex(INDEXES.events);
    if (!index) return { indexed: 0, failed: 0 };

    const supabase = getServiceSupabase();
    const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .eq('visibility', 'public');

    if (error || !events) {
        console.error('[MeiliIndex] Failed to fetch events:', error);
        return { indexed: 0, failed: 0 };
    }

    const docs: EventDocument[] = events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        city: event.city || '',
        tags: event.tags || [],
        organizer: event.organizer_name || '',
        organizerId: event.organizer_id,
        calendarId: event.calendar_id,
        date: new Date(event.date).getTime(),
        status: event.status,
        visibility: event.visibility,
        attendees: event.attendee_count || 0,
        coverImage: event.cover_image,
        createdAt: new Date(event.created_at).getTime(),
    }));

    try {
        await index.addDocuments(docs);
        console.log(`[MeiliIndex] Reindexed ${docs.length} events`);
        return { indexed: docs.length, failed: 0 };
    } catch (error) {
        console.error('[MeiliIndex] Reindex failed:', error);
        return { indexed: 0, failed: docs.length };
    }
}

// ============================================================================
// Calendar Indexing
// ============================================================================

/**
 * Index a single calendar
 */
export async function indexCalendar(calendarId: string): Promise<boolean> {
    const index = getIndex(INDEXES.calendars);
    if (!index) return false;

    const supabase = getServiceSupabase();
    const { data: calendar, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('id', calendarId)
        .single();

    if (error || !calendar) {
        console.error('[MeiliIndex] Calendar not found:', calendarId);
        return false;
    }

    const doc: CalendarDocument = {
        id: calendar.id,
        name: calendar.name,
        description: calendar.description || '',
        tags: calendar.tags || [],
        ownerId: calendar.owner_id,
        visibility: calendar.visibility,
        followerCount: calendar.follower_count || 0,
        createdAt: new Date(calendar.created_at).getTime(),
    };

    try {
        await index.addDocuments([doc]);
        console.log('[MeiliIndex] Indexed calendar:', calendarId);
        return true;
    } catch (error) {
        console.error('[MeiliIndex] Failed to index calendar:', error);
        return false;
    }
}

/**
 * Reindex all calendars
 */
export async function reindexAllCalendars(): Promise<{ indexed: number; failed: number }> {
    const index = getIndex(INDEXES.calendars);
    if (!index) return { indexed: 0, failed: 0 };

    const supabase = getServiceSupabase();
    const { data: calendars, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('visibility', 'public');

    if (error || !calendars) {
        console.error('[MeiliIndex] Failed to fetch calendars:', error);
        return { indexed: 0, failed: 0 };
    }

    const docs: CalendarDocument[] = calendars.map(calendar => ({
        id: calendar.id,
        name: calendar.name,
        description: calendar.description || '',
        tags: calendar.tags || [],
        ownerId: calendar.owner_id,
        visibility: calendar.visibility,
        followerCount: calendar.follower_count || 0,
        createdAt: new Date(calendar.created_at).getTime(),
    }));

    try {
        await index.addDocuments(docs);
        console.log(`[MeiliIndex] Reindexed ${docs.length} calendars`);
        return { indexed: docs.length, failed: 0 };
    } catch (error) {
        console.error('[MeiliIndex] Reindex failed:', error);
        return { indexed: 0, failed: docs.length };
    }
}
