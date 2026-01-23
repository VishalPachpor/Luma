/**
 * Event Repository - Supabase Implementation
 * Storing events in existing Supabase 'events' table
 */

import { createClient } from '@supabase/supabase-js';
import type { Event, CreateEventInput } from '@/types';
import type { Database } from '@/types/database.types';
import { generateId } from '@/lib/utils';

type EventRow = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];

// Create supabase client for read operations (works in both server and client)
const getPublicClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        console.warn('[EventRepo] Missing Supabase env vars');
        return null;
    }

    return createClient(url, anonKey);
};

// Create service role client for write operations (server-only)
const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error('Service role key required for this operation');
    }

    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
};

// Mock data for fallback when fetch fails or no data
const failedFetchFallback: Event[] = [];

// Helper to normalize Supabase data to Event type
function normalizeEvent(item: EventRow): Event {
    return {
        id: item.id,
        title: item.title,
        description: item.description || '',
        date: item.date || '', // date is string in DB
        location: item.location || '',
        city: item.city || '',
        coords: { lat: item.latitude || 0, lng: item.longitude || 0 },
        coverImage: item.cover_image || '',
        attendees: item.attendee_count || 0,
        tags: item.tags || [],
        organizer: item.organizer_name || '',
        organizerId: item.organizer_id,
        calendarId: item.calendar_id || undefined,
        capacity: item.capacity || undefined,
        price: item.price || undefined,
        status: (item.status as 'published' | 'draft' | 'archived' | 'live' | 'ended') || 'published',
        visibility: (item.visibility as 'public' | 'private') || 'public',
        requireApproval: item.require_approval || undefined,
        socialLinks: (item.social_links as any) || {}, // Json type
        agenda: (item.agenda as any) || [], // Json type
        hosts: (item.hosts as any) || [], // Json type
        about: (item.about as any) || [], // Json type
        presentedBy: item.presented_by || undefined,
        registrationQuestions: (item.registration_questions as any) || [], // Json type
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        theme: (item as any).theme,
        themeColor: (item as any).theme_color,
    };
}

/**
 * Get all events (uses public client - safe for client-side)
 */
export async function findAll(): Promise<Event[]> {
    try {
        const client = getPublicClient();
        if (!client) return failedFetchFallback;

        const { data, error } = await client
            .from('events')
            .select('*')
            // Fetch all visible states: published (future), live (now), ended (past)
            .in('status', ['published', 'live', 'ended'])
            .order('date', { ascending: false });

        if (error || !data) {
            console.log('[EventRepo] Error fetching events from Supabase:', error);
            return failedFetchFallback;
        }

        return data.map(normalizeEvent);
    } catch (error) {
        console.error('[EventRepo] Error fetching events from Supabase:', error);
        return failedFetchFallback;
    }
}

/**
 * Get event by ID (uses public client - works in both server and client)
 */
export async function findById(id: string): Promise<Event | null> {
    if (!id) return null;

    try {
        const client = getPublicClient();
        if (!client) return null;

        const { data, error } = await client
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
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
        const supabase = getAdminClient();
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
        const supabase = getAdminClient();
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
        const supabase = getAdminClient();
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
        const supabase = getAdminClient();
        const { data } = await supabase.from('events').select('*');
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
    const supabase = getAdminClient();
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

    const payload: EventInsert = {
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
        social_links: (input.socialLinks || {}) as any,
        agenda: (input.agenda || []) as any,
        hosts: (input.hosts || []) as any,
        about: input.about,
        presented_by: input.presentedBy,
        registration_questions: (input.registrationQuestions || []) as any,
        theme: input.theme,
        theme_color: input.themeColor,
    } as any;

    const { data, error } = await supabase
        .from('events')
        .insert(payload)
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
    const supabase = getAdminClient();

    // Convert snake_case if needed, but for now we map manually what we support in repository updates
    const supabaseUpdates: EventUpdate = {};
    if (updates.title) supabaseUpdates.title = updates.title;
    if (updates.description) supabaseUpdates.description = updates.description;
    if (updates.location) supabaseUpdates.location = updates.location;
    if (updates.coverImage) supabaseUpdates.cover_image = updates.coverImage;
    if (updates.date) supabaseUpdates.date = updates.date; // Should normalize date if needed
    if (updates.capacity !== undefined) supabaseUpdates.capacity = updates.capacity;
    if (updates.price !== undefined) supabaseUpdates.price = updates.price;
    if (updates.theme) (supabaseUpdates as any).theme = updates.theme;
    if (updates.themeColor) (supabaseUpdates as any).theme_color = updates.themeColor;
    // Add other fields as needed

    const { error } = await supabase.from('events').update(supabaseUpdates).eq('id', id);

    if (error) throw new Error(`Failed to update event: ${error.message}`);
}

/**
 * Delete an event
 */
export async function remove(id: string): Promise<boolean> {
    const supabase = getAdminClient();
    const { error } = await supabase.from('events').delete().eq('id', id);
    return !error;
}

/**
 * Find events by organizer (uses public client - safe for client-side)
 */
export async function findByOrganizer(userId: string): Promise<Event[]> {
    try {
        const client = getPublicClient();
        if (!client) return [];

        const { data, error } = await client
            .from('events')
            .select('*')
            .eq('organizer_id', userId)
            .order('date', { ascending: false });

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
        const supabase = getAdminClient();
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
