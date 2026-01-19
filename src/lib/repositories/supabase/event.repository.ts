/**
 * Supabase Event Repository
 * Full CRUD operations for events using Supabase
 */

import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Event, CreateEventInput } from '@/types/event';

const supabase = createSupabaseBrowserClient();

/**
 * Transform database row to Event type
 */
function rowToEvent(row: any): Event {
    return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        date: row.date,
        location: row.location || '',
        city: row.city || '',
        coords: { lat: row.latitude || 0, lng: row.longitude || 0 },
        coverImage: row.cover_image || '',
        attendees: row.attendee_count || 0,
        tags: row.tags || [],
        organizer: row.organizer_name || '',
        organizerId: row.organizer_id,
        calendarId: row.calendar_id,
        capacity: row.capacity,
        price: row.price,
        status: row.status || 'published',
        visibility: row.visibility || 'public',
        requireApproval: row.require_approval || false,
        registrationQuestions: row.registration_questions || [],
        socialLinks: row.social_links || {},
        agenda: row.agenda || [],
        hosts: row.hosts || [],
        whoShouldAttend: row.who_should_attend || [],
        eventFormat: row.event_format || [],
        presentedBy: row.presented_by,
        about: row.about || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * Transform Event to database insert format
 */
function eventToRow(event: Partial<Event>, organizerId?: string) {
    return {
        title: event.title,
        description: event.description,
        date: event.date,
        location: event.location,
        city: event.city,
        latitude: event.coords?.lat,
        longitude: event.coords?.lng,
        cover_image: event.coverImage,
        tags: event.tags,
        organizer_id: organizerId || event.organizerId,
        organizer_name: event.organizer,
        calendar_id: event.calendarId,
        capacity: event.capacity,
        price: event.price,
        status: event.status,
        visibility: event.visibility,
        require_approval: event.requireApproval,
        registration_questions: event.registrationQuestions,
        social_links: event.socialLinks,
        agenda: event.agenda,
        hosts: event.hosts,
        who_should_attend: event.whoShouldAttend,
        event_format: event.eventFormat,
        presented_by: event.presentedBy,
        about: event.about,
    };
}

/**
 * Find event by ID
 */
export async function findById(id: string): Promise<Event | null> {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('[EventRepo] Find by ID failed:', error);
        return null;
    }

    return rowToEvent(data);
}

/**
 * Find all published events
 */
export async function findAll(options?: {
    limit?: number;
    city?: string;
    category?: string;
    organizerId?: string;
}): Promise<Event[]> {
    let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('date', { ascending: true });

    if (options?.city) {
        query = query.eq('city', options.city);
    }

    if (options?.organizerId) {
        query = query.eq('organizer_id', options.organizerId);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[EventRepo] Find all failed:', error);
        return [];
    }

    return (data || []).map(rowToEvent);
}

/**
 * Find events by organizer
 */
export async function findByOrganizer(organizerId: string): Promise<Event[]> {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', organizerId)
        .order('date', { ascending: false });

    if (error) {
        console.error('[EventRepo] Find by organizer failed:', error);
        return [];
    }

    return (data || []).map(rowToEvent);
}

/**
 * Create event
 */
export async function create(input: CreateEventInput, organizerId: string): Promise<Event> {
    const row = eventToRow(input, organizerId);

    const { data, error } = await supabase
        .from('events')
        .insert(row)
        .select()
        .single();

    if (error) {
        console.error('[EventRepo] Create failed:', error);
        throw new Error(error.message);
    }

    return rowToEvent(data);
}

/**
 * Update event
 */
export async function update(id: string, updates: Partial<Event>): Promise<Event | null> {
    const row = eventToRow(updates);

    const { data, error } = await supabase
        .from('events')
        .update(row)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[EventRepo] Update failed:', error);
        return null;
    }

    return rowToEvent(data);
}

/**
 * Delete event
 */
export async function remove(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[EventRepo] Delete failed:', error);
        return false;
    }

    return true;
}

/**
 * Search events by title
 */
export async function search(query: string, limit: number = 20): Promise<Event[]> {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .ilike('title', `%${query}%`)
        .limit(limit);

    if (error) {
        console.error('[EventRepo] Search failed:', error);
        return [];
    }

    return (data || []).map(rowToEvent);
}

// Export as default object for backwards compatibility
export const eventRepository = {
    findById,
    findAll,
    findByOrganizer,
    create,
    update,
    remove,
    search,
};
