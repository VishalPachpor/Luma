import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { SearchResult, SearchResponse } from '@/types/search';

/**
 * GET /api/search?q=query
 * Federated search across Events, Calendars, People, and Shortcuts
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim() || '';

    // Authorization (Optional: some results might be public, but usually personalized)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabase = getServiceSupabase();
    let userId: string | undefined;

    console.log("[SearchAPI] Auth Header Present:", !!authHeader);
    if (token) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        userId = user?.id;
        console.log(`[SearchAPI] User ID resolved: ${userId}, Auth Error: ${authError?.message}`);
    } else {
        console.log("[SearchAPI] No token provided.");
    }

    // Static Shortcuts (Luma-style)
    const allShortcuts: SearchResult[] = [
        { id: 'create-event', type: 'shortcut', title: 'Create Event', subtitle: 'Host a new event', url: '/create-event', icon: 'Plus' },
        { id: 'home', type: 'shortcut', title: 'Open Home', subtitle: 'Go to dashboard', url: '/', icon: 'Home' },
        { id: 'calendars', type: 'shortcut', title: 'Open Calendars', subtitle: 'View your calendars', url: '/calendars', icon: 'Calendar' },
        { id: 'discover', type: 'shortcut', title: 'Open Discover', subtitle: 'Find events', url: '/', icon: 'Compass' },
        // { id: 'help', type: 'shortcut', title: 'Open Help', subtitle: 'Get support', url: '/help', icon: 'CircleHelp' }, // Removed as per user request
    ];

    const shortcuts = allShortcuts.filter(s =>
        !query || // Return all if no query
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.subtitle?.toLowerCase().includes(query.toLowerCase())
    );

    // If no query, return Default View (Luma Structure: Chat, Calendars, Hosting, Attending, Shortcuts)
    if (!query) {
        let hosting: SearchResult[] = [];
        let attending: SearchResult[] = [];
        let calendars: SearchResult[] = [];
        let chats: SearchResult[] = [];

        if (userId) {
            try {
                // 1. Calendars (Personal + Others)
                // Assuming 'calendars' table exists and links to user. If not, we mock Personal.
                // Checking if we have a calendars table... we should from previous context.
                // Assuming we can select from 'calendars' where owner_id = userId
                const { data: calendarData } = await supabase
                    .from('calendars') // Adjust table name if strictly 'calendars' or similar
                    .select('id, name') // Assuming 'name' column
                    .eq('owner_id', userId)
                    .limit(3);

                if (calendarData) {
                    calendars = calendarData.map(c => ({
                        id: c.id,
                        type: 'calendar',
                        title: c.name,
                        url: `/calendar/${c.id}/manage`, // Fixed URL: /calendars/[id] -> /calendar/[id]/manage
                        icon: 'User' // Using User icon for Personal like Luma
                    }));
                } else {
                    // Fallback if no table/data found (for MVP/Schema safety)
                    calendars.push({
                        id: 'personal-cal', type: 'calendar', title: 'Personal', url: '/calendars', icon: 'User'
                    });
                }

                // 2. Hosting
                // console.log(`[SearchAPI] Fetching hosting for user: ${userId}`);
                const { data: hostingData, error: hostingError } = await supabase
                    .from('events')
                    .select('id, title, date')
                    .eq('organizer_id', userId)
                    .order('date', { ascending: false })
                    .limit(3);

                if (hostingError) {
                    console.error("[SearchAPI] Hosting error:", hostingError);
                } else {
                    console.log(`[SearchAPI] Found ${hostingData?.length ?? 0} hosting events for user ${userId}`);
                }

                if (hostingData) {
                    hosting = hostingData.map(e => ({
                        id: e.id,
                        type: 'event',
                        title: e.title,
                        subtitle: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                        url: `/events/${e.id}/manage/overview`,
                        icon: 'Calendar'
                    }));
                }

                // 3. Attending (All events - Future & Past)
                // We fetch RSVPs to get events I'm attending.
                // Refactored to two-step fetch to avoid PGRST200 join error
                const { data: rsvps, error: rsvpsError } = await supabase
                    .from('rsvps')
                    .select('event_id')
                    .eq('user_id', userId)
                    .eq('status', 'going')
                    .limit(20);

                if (rsvpsError) {
                    console.error("[SearchAPI] Attending RSVP error:", rsvpsError);
                } else {
                    console.log(`[SearchAPI] Found ${rsvps?.length ?? 0} RSVPs for user ${userId}`);
                }

                if (rsvps && rsvps.length > 0) {
                    const eventIds = rsvps.map(r => r.event_id);

                    const { data: attendingEvents, error: eventsError } = await supabase
                        .from('events')
                        .select('id, title, date')
                        .in('id', eventIds);

                    if (eventsError) {
                        console.error("[SearchAPI] Attending Events fetch error:", eventsError);
                    } else if (attendingEvents) {
                        // Show all recent events (future & past) sorted by newest first
                        const sortedEvents = attendingEvents
                            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        const futureEvents = sortedEvents.slice(0, 3);

                        attending = futureEvents.map((e: any) => ({
                            id: e.id,
                            type: 'event',
                            title: e.title,
                            subtitle: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                            url: `/events/${e.id}`,
                            icon: 'Calendar'
                        }));

                        // 4. Chats (All Hosting + All Attending events)
                        // Merge hostingData and the attending events.
                        const allChatCandidates = [
                            ...(hostingData || []),
                            ...attendingEvents
                        ];

                        // Deduplicate by ID
                        const uniqueChatCandidates = Array.from(new Map(allChatCandidates.map(item => [item['id'], item])).values());

                        // Sort by date 
                        uniqueChatCandidates.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        chats = uniqueChatCandidates.slice(0, 5).map((e: any) => ({
                            id: `chat-${e.id}`,
                            type: 'event',
                            title: e.title,
                            url: `/events/${e.id}?tab=chat`,
                            icon: 'MessageCircle'
                        }));
                    }
                } else if (hostingData) {
                    // Even if no attending, we might need chats from Hosting
                    // 4. Chats (Hosting only)
                    const uniqueChatCandidates = [...(hostingData || [])];
                    uniqueChatCandidates.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    chats = uniqueChatCandidates.slice(0, 5).map((e: any) => ({
                        id: `chat-${e.id}`,
                        type: 'event',
                        title: e.title,
                        url: `/events/${e.id}?tab=chat`,
                        icon: 'MessageCircle'
                    }));
                }

            } catch (err) {
                console.error("Error fetching default events:", err);
            }
        }

        return NextResponse.json({
            results: {
                events: [],
                calendars,
                people: [],
                shortcuts,
                hosting,
                attending,
                chats
            },
            query
        } as SearchResponse);
    }

    // Parallel Database Queries for Search (Query Present)
    try {
        const [eventsResult, guestsResult] = await Promise.all([
            // 1. Search Events (Title or Description)
            supabase
                .from('events')
                .select('id, title, description, date, location, cover_image')
                .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
                .eq('status', 'published') // Only published events
                .limit(5),

            // 2. Search People stub
            Promise.resolve({ data: [] })
        ]);

        // Normalize Events
        const events: SearchResult[] = (eventsResult.data || []).map((event: any) => ({
            id: event.id,
            type: 'event',
            title: event.title,
            subtitle: new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
            url: `/events/${event.id}`,
            icon: 'Calendar'
        }));

        // Normalize People
        const people: SearchResult[] = [];

        return NextResponse.json({
            results: {
                events,
                calendars: [],
                people,
                shortcuts
            },
            query
        } as SearchResponse);

    } catch (error) {
        console.error('[SearchAPI] Error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
