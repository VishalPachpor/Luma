/**
 * Event Repository - Supabase Implementation
 * Storing events in existing Supabase 'events' table
 */

import { getServiceSupabase } from '@/lib/supabase';
import type { Event, CreateEventInput } from '@/types';
import { generateId } from '@/lib/utils';

// Mock data for fallback when fetch fails or no data
const mockEvents: Event[] = [];

// Helper to normalize Supabase data to Event type
function normalizeEvent(item: any): Event {
    return {
        id: item.id,
        title: item.title,
        description: item.description || '',
        date: item.date || item.start_time || '',
        location: item.location || '',
        city: item.city || '',
        coords: { lat: item.latitude || 0, lng: item.longitude || 0 },
        coverImage: item.cover_image || '',
        attendees: item.attendee_count || 0,
        tags: (item.tags as string[]) || [],
        organizer: item.organizer_name || '',
        organizerId: item.organizer_id || '',
        calendarId: item.calendar_id ?? undefined,
        capacity: item.capacity ?? undefined,
        price: item.price ?? undefined,
        status: (item.status as 'published' | 'draft' | 'archived') || 'published',
        visibility: (item.visibility as 'public' | 'private') || 'public',
        requireApproval: item.require_approval ?? undefined,
        socialLinks: item.social_links as any,
        agenda: item.agenda as any,
        hosts: item.hosts as any,
        about: item.about as any,
        presentedBy: item.presented_by ?? undefined,
        registrationQuestions: (item.registration_questions as any) || [],
        createdAt: item.created_at,
        updatedAt: item.updated_at,
    };
}

/**
 * Get all events
 */
export async function findAll(): Promise<Event[]> {
    try {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('created_at', { ascending: false });

        if (error || !data) {
            console.log('[EventRepo] Error fetching events from Supabase:', error);
            return mockEvents;
        }

        return data.map(normalizeEvent);
    } catch (error) {
        console.error('[EventRepo] Error fetching events from Supabase:', error);
        return mockEvents;
    }
}

/**
 * Get event by ID
 */
export async function findById(id: string): Promise<Event | null> {
    if (!id) return null;

    try {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            // console.log(`[EventRepo] Event ${id} not found.`);
            return null;
        }

        return normalizeEvent(data);
    } catch (error) {
        console.error(`[EventRepo] Error fetching event ${id}:`, error);
        return null;
    }
}

/**
 * Find events where user is attending
 * (Placeholder for now until we have registrations table mapped in repo)
 */
export async function findByAttendee(userId: string): Promise<Event[]> {
    return [];
}

/**
 * Get events by city
 */
export async function findByCity(city: string): Promise<Event[]> {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('city', city);

        if (error || !data) return [];
        return data.map(normalizeEvent);
    } catch (error) {
        return [];
    }
}

/**
 * Search events by query
 */
export async function search(queryStr: string): Promise<Event[]> {
    if (!queryStr || queryStr.length < 2) return [];

    try {
        const supabase = getServiceSupabase();
        // Simple ILIKE search on title or description
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .or(`title.ilike.%${queryStr}%,description.ilike.%${queryStr}%`);

        if (error || !data) return [];
        return data.map(normalizeEvent);
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

/**
 * Get events by tag
 */
export async function findByTag(tag: string): Promise<Event[]> {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .contains('tags', [tag]);

        if (error || !data) return [];
        return data.map(normalizeEvent);
    } catch (error) {
        return [];
    }
}

/**
 * Get unique cities
 */
export async function getUniqueCities(): Promise<string[]> {
    try {
        const supabase = getServiceSupabase();
        const { data } = await supabase.from('events').select('city');
        if (!data) return [];
        // distinct
        const cities = new Set(data.map(d => d.city).filter(Boolean));
        return Array.from(cities) as string[];
    } catch (e) {
        return [];
    }
}

/**
 * Create a new event
 */
export async function create(input: CreateEventInput): Promise<Event> {
    const supabase = getServiceSupabase();
    const eventId = input.id || generateId();

    // Parse date safely
    let isoDate = input.date;
    try {
        const dateStr = input.date.includes(',') && !input.date.match(/\d{4}/)
            ? `${input.date}, ${new Date().getFullYear()}`
            : input.date;
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
            isoDate = parsedDate.toISOString();
        } else {
            isoDate = new Date().toISOString();
        }
    } catch (e) {
        isoDate = new Date().toISOString();
    }

    if (!input.organizerId) {
        throw new Error('Organizer ID is required to create an event');
    }

    const { data, error } = await supabase
        .from('events')
        .insert({
            id: eventId,
            title: input.title,
            description: input.description,
            date: isoDate,
            location: input.location,
            city: input.city,
            latitude: input.coords?.lat || 0,
            longitude: input.coords?.lng || 0,
            cover_image: input.coverImage,
            attendee_count: input.attendees || 0,
            tags: input.tags || [],
            organizer_name: input.organizer,
            organizer_id: input.organizerId,
            calendar_id: input.calendarId,
            capacity: input.capacity,
            price: input.price,
            status: input.status || 'published',
            visibility: input.visibility || 'public',
            require_approval: input.requireApproval || false,
            social_links: input.socialLinks,
            agenda: input.agenda,
            hosts: input.hosts,
            about: input.about,
            presented_by: input.presentedBy,
            registration_questions: (input.registrationQuestions || []) as any,
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create event: ${error.message}`);
    }

    return normalizeEvent(data);
}

/**
 * Update an event
 */
export async function update(id: string, updates: Partial<CreateEventInput>): Promise<void> {
    const supabase = getServiceSupabase();

    // Convert snake_case if needed, but for now we map manually what we support in repository updates
    const supabaseUpdates: any = {};
    if (updates.title) supabaseUpdates.title = updates.title;
    if (updates.description) supabaseUpdates.description = updates.description;
    if (updates.location) supabaseUpdates.location = updates.location;
    if (updates.coverImage) supabaseUpdates.cover_image = updates.coverImage;
    if (updates.date) supabaseUpdates.date = updates.date; // Should normalize date if needed
    if (updates.capacity !== undefined) supabaseUpdates.capacity = updates.capacity;
    if (updates.price !== undefined) supabaseUpdates.price = updates.price;
    // Add other fields as needed

    const { error } = await supabase.from('events').update(supabaseUpdates).eq('id', id);

    if (error) throw new Error(`Failed to update event: ${error.message}`);
}

/**
 * Delete an event
 */
export async function remove(id: string): Promise<boolean> {
    const supabase = getServiceSupabase();
    const { error } = await supabase.from('events').delete().eq('id', id);
    return !error;
}

/**
 * Find events by organizer
 */
export async function findByOrganizer(userId: string): Promise<Event[]> {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('organizer_id', userId)
            .order('created_at', { ascending: false });

        if (error || !data) return [];
        return data.map(normalizeEvent);
    } catch (error) {
        return [];
    }
}

/**
 * Find events by Calendar ID
 */
export async function findByCalendarId(calendarId: string): Promise<Event[]> {
    if (!calendarId) return [];

    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('calendar_id', calendarId)
            .order('date', { ascending: true });

        if (error || !data) return [];
        return data.map(normalizeEvent);
    } catch (error) {
        return [];
    }
}
