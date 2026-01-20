import { SupabaseClient } from '@supabase/supabase-js';
import { CalendarPerson } from '@/types/calendar';
import type { Database } from '@/types/database.types';

type CalendarPersonRow = Database['public']['Tables']['calendar_people']['Row'];

export const calendarPeopleRepository = {
    /**
     * Get people for a calendar with filtering and sorting
     */
    async getCalendarPeople(
        supabase: SupabaseClient,
        calendarId: string,
        options: {
            search?: string;
            sortBy?: 'joined_at' | 'name' | 'events_attended';
            sortOrder?: 'asc' | 'desc';
        } = {}
    ): Promise<CalendarPerson[]> {
        let query = supabase
            .from('calendar_people')
            .select('*')
            .eq('calendar_id', calendarId);

        if (options.search) {
            query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
        }

        if (options.sortBy) {
            query = query.order(options.sortBy, { ascending: options.sortOrder === 'asc' });
        } else {
            query = query.order('joined_at', { ascending: false });
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data) return [];

        // Map to CamelCase type
        // The inferred type of 'data' is CalendarPersonRow[]
        return data.map(p => ({
            id: p.id,
            calendarId: p.calendar_id,
            email: p.email,
            name: p.name || undefined,
            avatarUrl: p.avatar_url || undefined,
            source: p.source as 'event' | 'import' | 'manual', // Cast literal if needed, but string is safe
            sourceEventId: p.source_event_id || undefined,
            joinedAt: p.joined_at,
            eventsAttended: p.events_attended,
            lastEventAt: p.last_event_at || undefined,
            subscribed: p.subscribed,
            unsubscribedAt: p.unsubscribed_at || undefined,
            tags: p.tags,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
        }));
    },

    /**
     * Sync people from all events owned by the user into this calendar.
     * Useful for initializing the CRM or updating it with legacy event data.
     */
    async syncFromEvents(supabase: SupabaseClient, calendarId: string, userId: string) {
        // 1. Get all events owned by user
        const { data: events, error: eventError } = await supabase
            .from('events')
            .select('id')
            .eq('organizer_id', userId);

        if (eventError || !events) throw new Error('Failed to fetch events');

        if (events.length === 0) return 0;

        const eventIds = events.map(e => e.id);

        // 2. Get all guests from these events
        // Correctly type the joined query result
        const { data: guests, error: guestError } = await supabase
            .from('guests')
            .select('user_id, event_id, status, profiles:user_id (email, display_name, avatar_url)')
            .in('event_id', eventIds)
            // .in('status', ['issued', 'approved', 'scanned']) // Maybe sync all? Luma CRM likely includes all who registered.
            .not('user_id', 'is', null); // Ensure valid user link

        if (guestError || !guests) throw new Error('Failed to fetch guests');

        let syncedCount = 0;

        // 3. Upsert each guest into calendar_people
        // We can use the Postgres function `upsert_calendar_person` for atomic upsert
        for (const guest of guests) {
            // guest.profiles will be an object or null because it's a single relation (user_id -> profile.id)
            // However, Supabase types might infer it as an array if not explicit 1-to-1 in types, usually it's smart.
            // Let's verify type safety by checking constraints. Assuming 1-to-1.
            const profile = guest.profiles;

            // Type check: profile should be object with email, display_name, avatar_url
            // If the join returns an array, we'd need to take the first element.
            // But based on user_id -> profiles definition, it should be single.
            // If Typescript complains, we might need a small guard.

            // Safe access using standard JS checks
            // 'profile' here effectively is { email: string | null, ... } | null | { ... }[] depending on inference
            // For safety without 'any', let's treat it as potentially unknown but structured

            // The generated types for 'guests' usually have joined fields as ... | { ... } | ...[]
            // But 'profiles:user_id' is a specific FK join. 
            // If explicit type is needed we can assert, but let's try natural inference first.

            // Check if profile is an object and has email, handling potential array return from join (though unlikely)
            const profileData = Array.isArray(profile) ? profile[0] : profile;

            if (!profileData) continue; // Skip if no profile

            const email = profileData.email;
            if (!email) continue;

            const { error: upsertError } = await supabase.rpc('upsert_calendar_person', {
                p_calendar_id: calendarId,
                p_email: email,
                p_name: profileData.display_name || null,
                p_source: 'event',
                p_source_event_id: guest.event_id
            });

            if (!upsertError) {
                syncedCount++;
            } else {
                console.error("Failed to upsert person:", upsertError);
            }
        }

        return syncedCount;
    },

    /**
     * Manually add a person to the calendar CRM
     */
    async addPerson(
        supabase: SupabaseClient,
        calendarId: string,
        data: { email: string; name?: string; tags?: string[] }
    ) {
        const { data: personId, error } = await supabase.rpc('upsert_calendar_person', {
            p_calendar_id: calendarId,
            p_email: data.email,
            p_name: data.name || null,
            p_source: 'import'
        });

        if (error) throw error;
        return personId;
    }
};
