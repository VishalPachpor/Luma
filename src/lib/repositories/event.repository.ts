/**
 * Event Repository - Firestore Implementation
 * Persists events to Firestore for real data storage
 */

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { Event, CreateEventInput } from '@/types';
import { generateId } from '@/lib/utils';

// Collection reference
const EVENTS_COLLECTION = 'events';

const CURRENT_YEAR = new Date().getFullYear();

// Mock data for fallback when Firebase not configured
const mockEvents: Event[] = [
    {
        id: '1',
        title: 'Apple Keynote: Future Forward',
        description: 'Join us for a special Apple Event to unveil our latest innovations.',
        date: `Sep 12, ${CURRENT_YEAR}, 10:00 AM`,
        location: 'Steve Jobs Theater, CA',
        city: 'San Francisco',
        coords: { lat: 37.3349, lng: -122.009 },
        coverImage: 'https://picsum.photos/seed/apple-event/800/600',
        attendees: 1240,
        tags: ['Tech', 'Keynote'],
        organizer: 'Apple',
        organizerId: '1',
        status: 'published',
        visibility: 'public',
    },
    {
        id: '2',
        title: 'Design System Masterclass',
        description: 'Learn how to build scalable UI systems for modern web apps.',
        date: `Oct 05, ${CURRENT_YEAR}, 2:00 PM`,
        location: 'The Design Loft',
        city: 'New York',
        coords: { lat: 40.7128, lng: -74.006 },
        coverImage: 'https://picsum.photos/seed/design/800/600',
        attendees: 450,
        tags: ['Design', 'UI/UX'],
        organizer: 'Linear Team',
        organizerId: '1',
        status: 'published',
        visibility: 'public',
    },
];

// Helper to normalize Firestore data to Event type
function normalizeEvent(doc: any): Event {
    const data = doc.data ? doc.data() : doc;
    const id = doc.id || data.id;

    // safe date conversion
    const formatDate = (val: any) => {
        if (!val) return new Date().toISOString();
        if (typeof val?.toDate === 'function') return val.toDate().toISOString();
        if (val instanceof Date) return val.toISOString();
        return String(val);
    };

    return {
        ...data,
        id,
        date: formatDate(data.date),
        createdAt: data.createdAt ? formatDate(data.createdAt) : undefined,
        updatedAt: data.updatedAt ? formatDate(data.updatedAt) : undefined,
        socialLinks: data.socialLinks || {},
        agenda: data.agenda || [],
        hosts: data.hosts || [],
        about: data.about || [],

        // Luma Architecture Fields with Fallbacks for legacy data
        status: data.status || 'published',
        visibility: data.visibility || 'public',
        ticketTiers: data.ticketTiers || [],

        // Ensure other potential Timestamps are strings if added to Event type later
    } as Event;
}

/**
 * Get all events
 */
export async function findAll(): Promise<Event[]> {
    // When Firebase is disabled, use Supabase
    if (!db || !isFirebaseConfigured) {
        console.log('[EventRepo] Firebase not configured. Fetching all events from Supabase...');
        try {
            // Use direct Supabase client for public reads (no auth needed)
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('created_at', { ascending: false });

            if (error || !data) {
                console.log('[EventRepo] Error fetching events from Supabase. Usage mock data.', error);
                return mockEvents;
            }

            // Map Supabase rows to Event type
            return data.map(item => ({
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
            }));
        } catch (error) {
            console.error('[EventRepo] Error fetching events from Supabase:', error);
            return mockEvents;
        }
    }

    try {
        const eventsRef = collection(db, EVENTS_COLLECTION);
        const q = query(eventsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            // Return mock events if no events in Firestore
            return mockEvents;
        }

        return snapshot.docs.map(normalizeEvent);
    } catch (error) {
        console.error('Error fetching events:', error);
        return mockEvents;
    }
}

/**
 * Get event by ID
 */
export async function findById(id: string): Promise<Event | null> {
    if (!id) {
        console.warn('findById called with empty ID');
        return null;
    }

    // When Firebase is disabled, use Supabase
    if (!db || !isFirebaseConfigured) {
        console.log(`[EventRepo] Firebase not configured. Fetching event ${id} from Supabase...`);
        try {
            // Use direct Supabase client for public reads (no auth needed)
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                console.log(`[EventRepo] Event ${id} not found in Supabase. Checking mock data.`);
                return mockEvents.find((e) => e.id === id) ?? null;
            }

            // Map Supabase row to Event type
            return {
                id: data.id,
                title: data.title,
                description: data.description || '',
                date: data.date || '',
                location: data.location || '',
                city: data.city || '',
                coords: { lat: data.latitude || 0, lng: data.longitude || 0 },
                coverImage: data.cover_image || '',
                attendees: data.attendee_count || 0,
                tags: (data.tags as string[]) || [],
                organizer: data.organizer_name || '',
                organizerId: data.organizer_id || '',
                calendarId: data.calendar_id ?? undefined,
                capacity: data.capacity ?? undefined,
                price: data.price ?? undefined,
                status: (data.status as 'published' | 'draft' | 'archived') || 'published',
                visibility: (data.visibility as 'public' | 'private') || 'public',
                requireApproval: data.require_approval ?? undefined,
                socialLinks: data.social_links as any,
                agenda: data.agenda as any,
                hosts: data.hosts as any,
                about: data.about as any,
                presentedBy: data.presented_by ?? undefined,
                registrationQuestions: (data.registration_questions as any) || [],
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
        } catch (error) {
            console.error(`[EventRepo] Error fetching event ${id} from Supabase:`, error);
            return mockEvents.find((e) => e.id === id) ?? null;
        }
    }

    try {
        console.log(`[EventRepo] Fetching event ${id} from Firestore...`);
        const eventRef = doc(db, EVENTS_COLLECTION, id);
        const snapshot = await getDoc(eventRef);

        if (!snapshot.exists()) {
            console.log(`[EventRepo] Event ${id} not found in Firestore. Checking mock data.`);
            return mockEvents.find((e) => e.id === id) ?? null;
        }

        return normalizeEvent(snapshot);
    } catch (error: any) {
        if (error?.code === 'permission-denied') {
            console.warn(`[EventRepo] Permission denied fetching event ${id} (likely server-side). Using mock data.`);
        } else {
            console.error(`[EventRepo] Error fetching event ${id}:`, error);
        }
        // Fallback to mock data on error (e.g. permission issues or TypeErrors)
        return mockEvents.find((e) => e.id === id) ?? null;
    }
}



/**
 * Find events where user is attending
 */
export async function findByAttendee(userId: string): Promise<Event[]> {
    // Limitation: In a real app, we'd query a separate 'registrations' collection.
    // For now, checks if the events array contains a field (not scalable) or mocked.
    // Since our Event model has 'attendees: number' but valid app would have a subcollection.
    // We will assume for this demo that we fetch all and filter in memory if using mock,
    // or just return empty for Supabase if we don't have the relation set up yet.

    // MOCK IMPLEMENTATION
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // Return a random subset of events for demo purposes to populate the UI
        return mockEvents.slice(0, 3);
    }

    // REAL IMPLEMENTATION (Skeleton)
    // In a real Supabase/Postgres, we would join with a registrations table.
    // await supabase.from('registrations').select('event_id').eq('user_id', userId)...
    return [];
}

/**
 * Get events by city
 */
export async function findByCity(city: string): Promise<Event[]> {
    if (!db || !isFirebaseConfigured) {
        return mockEvents.filter((e) => e.city === city);
    }

    try {
        const eventsRef = collection(db, EVENTS_COLLECTION);
        const q = query(eventsRef, where('city', '==', city));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(normalizeEvent);
    } catch (error) {
        console.error('Error fetching events by city:', error);
        return mockEvents.filter((e) => e.city === city);
    }
}

/**
 * Search events by query
 */
export async function search(queryStr: string): Promise<Event[]> {
    if (!queryStr || queryStr.length < 2) return [];

    try {
        const response = await fetch(`/api/events/search?q=${encodeURIComponent(queryStr)}`);
        if (!response.ok) throw new Error('Search failed');
        return await response.json();
    } catch (error) {
        console.error('Search API error, falling back to client filter:', error);

        // Fallback: Client-side filter (keep old logic just in case API fails)
        const allEvents = await findAll();
        const lowerQuery = queryStr.toLowerCase();
        return allEvents.filter(
            (event) =>
                event.title.toLowerCase().includes(lowerQuery) ||
                event.description.toLowerCase().includes(lowerQuery) ||
                event.tags.some((t) => t.toLowerCase().includes(lowerQuery))
        );
    }
}

/**
 * Get events by tag
 */
export async function findByTag(tag: string): Promise<Event[]> {
    if (!db || !isFirebaseConfigured) {
        return mockEvents.filter((e) => e.tags.includes(tag));
    }

    try {
        const eventsRef = collection(db, EVENTS_COLLECTION);
        const q = query(eventsRef, where('tags', 'array-contains', tag));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(normalizeEvent);
    } catch (error) {
        console.error('Error fetching events by tag:', error);
        return mockEvents.filter((e) => e.tags.includes(tag));
    }
}

/**
 * Get unique cities
 */
export async function getUniqueCities(): Promise<string[]> {
    const allEvents = await findAll();
    return [...new Set(allEvents.map((e) => e.city))];
}

/**
 * Create a new event
 */
export async function create(input: CreateEventInput): Promise<Event> {
    // When Firebase is disabled, write directly to Supabase
    if (!db || !isFirebaseConfigured) {
        console.log('[EventRepo] Firebase not configured. Creating event in Supabase...');
        try {
            // Use browser Supabase client which has the active session (needed for RLS)
            const { createSupabaseBrowserClient } = await import('@/lib/supabase-browser');
            const supabase = createSupabaseBrowserClient();

            const eventId = input.id || generateId();

            // Parse date string to ISO format for Supabase (e.g. "Jan 17, 4:00 PM" -> ISO string)
            let isoDate = input.date;
            try {
                // Try parsing the date string. If it's "Jan 17, 4:00 PM", append current year
                const dateStr = input.date.includes(',') && !input.date.match(/\d{4}/)
                    ? `${input.date}, ${new Date().getFullYear()}`
                    : input.date;

                const parsedDate = new Date(dateStr);

                // Check if valid date
                if (!isNaN(parsedDate.getTime())) {
                    isoDate = parsedDate.toISOString();
                } else {
                    console.warn('[EventRepo] Could not parse date:', input.date, 'Using default');
                    isoDate = new Date().toISOString(); // Fallback to now if parse fails
                }
            } catch (e) {
                console.error('[EventRepo] Date parsing error:', e);
                isoDate = new Date().toISOString();
            }

            if (!input.organizerId) {
                throw new Error('Organizer ID is required to create an event');
            }

            // Map camelCase Event type to snake_case Supabase columns
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
                console.error('[EventRepo] Supabase insert error:', error);
                throw new Error(`Failed to create event: ${error.message}`);
            }

            console.log('[EventRepo] Event created successfully in Supabase:', data.id);

            // Return the created event mapped back to Event type
            return {
                id: data.id,
                title: data.title,
                description: data.description || '',
                date: data.date || '',
                location: data.location || '',
                city: data.city || '',
                coords: { lat: data.latitude || 0, lng: data.longitude || 0 },
                coverImage: data.cover_image || '',
                attendees: data.attendee_count || 0,
                tags: (data.tags as string[]) || [],
                organizer: data.organizer_name || '',
                organizerId: data.organizer_id || '',
                calendarId: data.calendar_id ?? undefined,
                capacity: data.capacity ?? undefined,
                price: data.price ?? undefined,
                status: (data.status as 'published' | 'draft' | 'archived') || 'published',
                visibility: (data.visibility as 'public' | 'private') || 'public',
                requireApproval: data.require_approval ?? undefined,
                socialLinks: data.social_links as any,
                agenda: data.agenda as any,
                hosts: data.hosts as any,
                about: data.about as any,
                presentedBy: data.presented_by ?? undefined,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
        } catch (error) {
            console.error('[EventRepo] Error creating event in Supabase:', error);
            throw error;
        }
    }

    try {
        // Get current user token for authentication
        const { auth } = await import('@/lib/firebase');

        if (!auth || !auth.currentUser) {
            throw new Error('User must be authenticated to create an event');
        }

        const user = auth.currentUser;

        const token = await user.getIdToken();

        // Use the Dual-Write API (Trusted Broker)
        // This ensures the event is written to both Firestore and Supabase securely
        const response = await fetch('/api/events/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(input)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create event via API');
        }

        const result = await response.json();

        // Return the constructed event object (optimistic-like return)
        // Ideally we would fetch it back, but we know what we sent.
        return {
            ...input,
            id: result.eventId,
            // createdAt: new Date() - createdAt not in simple Event type but implied
            attendees: 0
        } as unknown as Event; // Casting because timestamps might mismatch slightly in types but structurally okay

    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
}

/**
 * Update an event
 */
export async function update(id: string, updates: Partial<CreateEventInput>): Promise<void> {
    if (!db || !isFirebaseConfigured) {
        // Mock update
        const index = mockEvents.findIndex(e => e.id === id);
        if (index !== -1) {
            mockEvents[index] = { ...mockEvents[index], ...updates } as Event;
        }
        return;
    }

    try {
        const { auth } = await import('@/lib/firebase');
        if (!auth?.currentUser) throw new Error('Unauthorized');
        const token = await auth.currentUser.getIdToken();

        const response = await fetch(`/api/events/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) throw new Error('Update failed');

    } catch (error) {
        console.error('Error updating event:', error);
        throw error;
    }
}

/**
 * Delete an event
 */
export async function remove(id: string): Promise<boolean> {
    if (!db || !isFirebaseConfigured) {
        const index = mockEvents.findIndex((e) => e.id === id);
        if (index === -1) return false;
        mockEvents.splice(index, 1);
        return true;
    }

    try {
        const { auth } = await import('@/lib/firebase');
        // If not authenticated, we can't secure delete via API
        // But for consistency with old behavior, maybe we try direct delete if API fails?
        // No, trusted broker pattern requires API.

        if (!auth?.currentUser) {
            throw new Error('Must be logged in to delete');
        }
        const token = await auth.currentUser.getIdToken();

        const response = await fetch(`/api/events/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        return response.ok;
    } catch (error) {
        console.error('Error deleting event:', error);
        return false;
    }
}

/**
 * Find events by organizer
 */
export async function findByOrganizer(userId: string): Promise<Event[]> {
    // When Firebase is disabled, use Supabase
    if (!db || !isFirebaseConfigured) {
        console.log(`[EventRepo] Firebase not configured. Fetching events for organizer ${userId} from Supabase...`);
        try {
            // Use direct Supabase client for public reads
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('organizer_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[EventRepo] Supabase error fetching organizer events:', error);
                return mockEvents.filter(e => e.organizerId === userId);
            }

            if (!data || data.length === 0) {
                console.log(`[EventRepo] No events found for organizer ${userId} in Supabase.`);
                return mockEvents.filter(e => e.organizerId === userId);
            }

            console.log(`[EventRepo] Found ${data.length} events for organizer ${userId} in Supabase`);

            // Map Supabase rows to Event type
            return data.map((row: any) => ({
                id: row.id,
                title: row.title,
                description: row.description || '',
                date: row.date || '',
                location: row.location || '',
                city: row.city || '',
                coords: { lat: row.latitude || 0, lng: row.longitude || 0 },
                coverImage: row.cover_image || '',
                attendees: row.attendee_count || 0,
                tags: (row.tags as string[]) || [],
                organizer: row.organizer_name || '',
                organizerId: row.organizer_id || '',
                calendarId: row.calendar_id ?? undefined,
                capacity: row.capacity ?? undefined,
                price: row.price ?? undefined,
                status: (row.status as 'published' | 'draft' | 'archived') || 'published',
                visibility: (row.visibility as 'public' | 'private') || 'public',
                requireApproval: row.require_approval ?? undefined,
                socialLinks: row.social_links as any,
                agenda: row.agenda as any,
                hosts: row.hosts as any,
                about: row.about as any,
                presentedBy: row.presented_by ?? undefined,
                registrationQuestions: (row.registration_questions as any) || [],
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }));
        } catch (error) {
            console.error('[EventRepo] Error fetching organizer events from Supabase:', error);
            return mockEvents.filter(e => e.organizerId === userId);
        }
    }

    // Firebase fallback (if configured)
    try {
        const eventsRef = collection(db, EVENTS_COLLECTION);

        // Attempt fast, indexed sort first
        try {
            const q = query(eventsRef, where('organizerId', '==', userId), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(normalizeEvent);
        } catch (indexError: any) {
            // Fallback to client-side sorting if index missing
            if (indexError?.code === 'failed-precondition' || indexError?.message?.includes('requires an index')) {
                console.warn('[EventRepo] Index missing for sorted query, falling back to unsorted query + client sort.');

                const fallbackQ = query(eventsRef, where('organizerId', '==', userId));
                const snapshot = await getDocs(fallbackQ);

                const events = snapshot.docs.map(normalizeEvent);
                // Sort in memory (newest first)
                return events.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateB - dateA;
                });
            }
            throw indexError; // Re-throw other errors
        }
    } catch (error) {
        console.error('Error fetching organizer events:', error);
        return [];
    }
}

/**
 * Find events by Calendar ID
 */
export async function findByCalendarId(calendarId: string): Promise<Event[]> {
    if (!calendarId) return [];

    // Try Firestore
    if (db && isFirebaseConfigured) {
        try {
            const eventsRef = collection(db, EVENTS_COLLECTION);
            const q = query(
                eventsRef,
                where('calendarId', '==', calendarId),
                orderBy('date', 'asc')
            );
            const snapshot = await getDocs(q);

            return snapshot.docs.map(normalizeEvent);
        } catch (error) {
            console.error('[EventRepo] Firestore findByCalendarId failed:', error);
        }
    }

    return [];
}
