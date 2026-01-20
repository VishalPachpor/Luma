import { SupabaseClient } from '@supabase/supabase-js';
import { CalendarPerson } from '@/types/calendar';

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
    ) {
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

        // Map to CamelCase type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (data as any[]).map(p => ({
            id: p.id,
            calendarId: p.calendar_id,
            email: p.email,
            name: p.name,
            avatarUrl: p.avatar_url,
            source: p.source,
            sourceEventId: p.source_event_id,
            joinedAt: p.joined_at,
            eventsAttended: p.events_attended,
            lastEventAt: p.last_event_at,
            subscribed: p.subscribed,
            unsubscribedAt: p.unsubscribed_at,
            tags: p.tags,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
        })) as CalendarPerson[];
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
        const { data: guests, error: guestError } = await supabase
            .from('guests')
            .select(`
                user_id,
                event_id,
                status,
                profiles:user_id (email, display_name, avatar_url)
            `)
            .in('event_id', eventIds)
            // .in('status', ['issued', 'approved', 'scanned']) // Maybe sync all? Luma CRM likely includes all who registered.
            .not('user_id', 'is', null); // Ensure valid user link

        if (guestError || !guests) throw new Error('Failed to fetch guests');

        let syncedCount = 0;

        // 3. Upsert each guest into calendar_people
        // We can use the Postgres function `upsert_calendar_person` for atomic upsert
        for (const guest of guests) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profile = (guest as any).profiles;
            if (!profile || !profile.email) continue;

            const { error: upsertError } = await supabase.rpc('upsert_calendar_person', {
                p_calendar_id: calendarId,
                p_email: profile.email,
                p_name: profile.display_name,
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
            p_name: data.name,
            p_source: 'import'
        });

        if (error) throw error;
        return personId;
    }
};
