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

    if (token) {
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
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
                // PERFORMANCE FIX: Fetch all data in PARALLEL instead of sequential
                const [calendarResult, hostingResult, rsvpsResult] = await Promise.all([
                    // 1. Calendars
                    supabase
                        .from('calendars')
                        .select('id, name')
                        .eq('owner_id', userId)
                        .limit(3),
                    // 2. Hosting events
                    supabase
                        .from('events')
                        .select('id, title, date')
                        .eq('organizer_id', userId)
                        .order('date', { ascending: false })
                        .limit(3),
                    // 3. RSVPs (attending)
                    supabase
                        .from('rsvps')
                        .select('event_id')
                        .eq('user_id', userId)
                        .eq('status', 'going')
                        .limit(20)
                ]);

                const calendarData = calendarResult.data;
                const hostingData = hostingResult.data;
                const rsvps = rsvpsResult.data;

                // Process calendars
                if (calendarData && calendarData.length > 0) {
                    calendars = calendarData.map(c => ({
                        id: c.id,
                        type: 'calendar',
                        title: c.name,
                        url: `/calendar/${c.id}/manage`,
                        icon: 'User'
                    }));
                } else {
                    calendars.push({
                        id: 'personal-cal', type: 'calendar', title: 'Personal', url: '/calendars', icon: 'User'
                    });
                }

                // Process hosting
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

                // Process attending (need second query for event details)
                if (rsvps && rsvps.length > 0) {
                    const eventIds = rsvps.map(r => r.event_id);
                    const { data: attendingEvents } = await supabase
                        .from('events')
                        .select('id, title, date')
                        .in('id', eventIds)
                        .order('date', { ascending: false })
                        .limit(5);

                    if (attendingEvents) {
                        attending = attendingEvents.slice(0, 3).map((e: any) => ({
                            id: e.id,
                            type: 'event',
                            title: e.title,
                            subtitle: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                            url: `/events/${e.id}`,
                            icon: 'Calendar'
                        }));

                        // Build chats from hosting + attending (already sorted from DB)
                        const allChatCandidates = [...(hostingData || []), ...attendingEvents];
                        const uniqueChats = Array.from(new Map(allChatCandidates.map(item => [item.id, item])).values());
                        chats = uniqueChats.slice(0, 5).map((e: any) => ({
                            id: `chat-${e.id}`,
                            type: 'event',
                            title: e.title,
                            url: `/events/${e.id}?tab=chat`,
                            icon: 'MessageCircle'
                        }));
                    }
                } else if (hostingData && hostingData.length > 0) {
                    chats = hostingData.slice(0, 5).map((e: any) => ({
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

    // Unified Search via Search Index (RPC)
    try {
        const { data: searchResults, error } = await supabase
            .rpc('search_global', { query_text: query });

        if (error) {
            console.error('[SearchAPI] RPC Error:', error);
            throw error;
        }

        const formattedResults: SearchResult[] = (searchResults || []).map((item: any) => ({
            id: item.entity_id, // Link to the actual entity ID, not the index ID
            type: item.entity_type === 'user' ? 'person' : item.entity_type as any,
            title: item.title,
            subtitle: item.subtitle || undefined,
            url: item.url,
            icon: item.icon || undefined
        }));

        // Split results by type for the UI
        const events = formattedResults.filter(r => r.type === 'event');
        const people = formattedResults.filter(r => r.type === 'person');
        const calendars = formattedResults.filter(r => r.type === 'calendar');
        // Actions/Shortcuts from index? (We still have static shortcuts)

        // Merge static shortcuts with index shortcuts if any
        const indexShortcuts = formattedResults.filter(r => r.type === 'shortcut' || r.type === 'action');

        return NextResponse.json({
            results: {
                events,
                calendars,
                people,
                shortcuts: [...shortcuts, ...indexShortcuts],
                hosting: [], // Search mode doesn't show hosting/attending specifically unless matched
                attending: [],
                chats: []
            },
            query
        } as SearchResponse);

    } catch (error) {
        console.error('[SearchAPI] Error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
