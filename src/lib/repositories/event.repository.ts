/**
 * Event Repository - Supabase Implementation
 * Storing events in existing Supabase 'events' table
 */

import type { Event, CreateEventInput } from '@/types';
import type { Database } from '@/types/database.types';
import { generateId } from '@/lib/utils';
import { getServiceSupabase } from '@/lib/supabase';

type EventRow = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];

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
        requireStake: item.require_stake || false,
        stakeAmount: item.stake_amount || undefined,
        organizerWallet: item.organizer_wallet || undefined,
        socialLinks: (item.social_links as any) || {}, // Json type
        agenda: (item.agenda as any) || [], // Json type
        hosts: (item.hosts as any) || [], // Json type
        about: (item.about as any) || [], // Json type
        presentedBy: item.presented_by || undefined,
        registrationQuestions: (item.registration_questions as any) || [], // Json type
        settings: (item.settings as any) || {}, // Json type
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        theme: (item as any).theme,
        themeColor: (item as any).theme_color,
    };
}

/**
 * Get all events (OPTIMIZED: selective columns)
 */
export async function findAll(): Promise<Event[]> {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('events')
            .select(`
                id, title, description, date, end_date, location, city,
                latitude, longitude, cover_image, attendee_count,
                tags, organizer_name, organizer_id, calendar_id,
                capacity, price, currency, status, visibility, 
                require_approval, require_stake, stake_amount, organizer_wallet,
                social_links, agenda, hosts, about, presented_by,
                registration_questions, theme, theme_color,
                counters, settings, metadata, who_should_attend, event_format,
                created_at, updated_at
            `)
            .in('status', ['published', 'live', 'ended'])
            .order('date', { ascending: false })
            .limit(100);

        if (error || !data) {
            return failedFetchFallback;
        }

        return data.map(normalizeEvent);
    } catch (error) {
        console.error('[EventRepo] Error fetching events:', error);
        return failedFetchFallback;
    }
}

/**
 * Get event by ID (uses public client - works in both server and client)
 */
export async function findById(id: string): Promise<Event | null> {
    if (!id) return null;

    try {
        // Use public client for client-side compatibility
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        const client = createClient(supabaseUrl, supabaseAnonKey);
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
    const supabase = getServiceSupabase();

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

    // Validate organizer_id is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(input.organizerId)) {
        throw new Error(`Invalid organizer ID format. Expected UUID, got: ${input.organizerId}. Please ensure you are authenticated via Supabase Auth.`);
    }

    // Build payload WITHOUT id - let PostgreSQL auto-generate the UUID
    // This ensures the event_id is always a proper UUID type for triggers
    const payload: Partial<EventInsert> = {
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
        // Only include calendar_id if it's a valid UUID
        ...(input.calendarId && uuidRegex.test(input.calendarId) ? { calendar_id: input.calendarId } : {}),
        capacity: input.capacity,
        price: input.price,
        status: input.status || 'published',
        visibility: input.visibility || 'public',
        require_approval: input.requireApproval || false,
        require_stake: input.requireStake || false,
        stake_amount: input.stakeAmount || null,
        organizer_wallet: input.organizerWallet || null,
        social_links: (input.socialLinks || {}) as any,
        agenda: (input.agenda || []) as any,
        hosts: (input.hosts || []) as any,
        about: input.about,
        presented_by: input.presentedBy,
        registration_questions: (input.registrationQuestions || []) as any,
        theme: input.theme,
        theme_color: input.themeColor,
    };

    console.log('[EventRepo] Creating event with payload:', {
        title: payload.title,
        organizer_id: payload.organizer_id,
        date: payload.date
    });

    // First, try standard insert
    const { data, error } = await supabase
        .from('events')
        .insert(payload as any)
        .select()
        .single();

    if (error) {
        console.error('[EventRepo] Standard insert failed:', error.message);

        // If the error is related to UUID/TEXT mismatch in triggers, try raw SQL
        if (error.message.includes('uuid') && error.message.includes('text')) {
            console.log('[EventRepo] Attempting raw SQL insert to bypass trigger issues...');

            try {
                // Use RPC or raw SQL approach
                const { data: rawData, error: rawError } = await supabase.rpc('create_event_safe', {
                    p_title: payload.title,
                    p_description: payload.description || '',
                    p_date: payload.date,
                    p_location: payload.location || '',
                    p_city: payload.city || '',
                    p_organizer_id: payload.organizer_id,
                    p_organizer_name: payload.organizer_name || '',
                    p_price: payload.price || 0,
                    p_require_approval: payload.require_approval || false,
                    p_cover_image: payload.cover_image || '',
                    p_status: payload.status || 'published',
                    p_visibility: payload.visibility || 'public',
                });

                if (rawError) {
                    throw rawError;
                }

                // Fetch the created event
                if (rawData) {
                    const { data: eventData } = await supabase
                        .from('events')
                        .select('*')
                        .eq('id', rawData)
                        .single();

                    if (eventData) {
                        console.log('[EventRepo] Event created via RPC:', rawData);
                        return normalizeEvent(eventData);
                    }
                }
            } catch (rpcError: any) {
                console.error('[EventRepo] RPC fallback also failed:', rpcError.message);
            }
        }

        throw new Error(`Failed to create event: ${error.message}`);
    }

    console.log('[EventRepo] Event created successfully:', data?.id);
    return normalizeEvent(data);
}

/**
 * Update an event
 */
export async function update(id: string, updates: Partial<CreateEventInput>): Promise<void> {
    const supabase = getServiceSupabase();

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
    if (updates.settings) (supabaseUpdates as any).settings = updates.settings;
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
 * Find events by organizer (uses public client - safe for client-side)
 */
export async function findByOrganizer(userId: string): Promise<Event[]> {
    try {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
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
