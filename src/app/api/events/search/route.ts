import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Search API
// Proxies the search request to Supabase's Postgres Full Text Search engine
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        // Call the 'search_events' Postgres function (Remote Procedure Call)
        const { data, error } = await supabase.rpc('search_events', {
            query_text: query
        });

        if (error) {
            console.error('Supabase Search Error:', error);
            throw error;
        }

        // Transform data to match App Event type if needed, 
        // snake_case (DB) -> camelCase (App) mapping might be needed 
        // depending on how strict existing types are.
        // Our 'events' table uses snake_case props? No, schema says:
        // title, description, date... those match.
        // organizer_id -> organizerId, cover_image -> coverImage mapping needed?

        // Let's verify schema.sql created earlier:
        // organizer_id, cover_image, created_at, updated_at

        const mappedEvents = data?.map((e: any) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            date: e.date, // ISO string
            location: e.location,
            city: e.metadata?.city || '',
            organizerId: e.organizer_id,
            coverImage: e.cover_image,
            category: e.category,
            capacity: e.capacity,
            price: e.price,
            tags: e.metadata?.tags || [],
            attendees: 0, // Search rarely needs exact count, 0 is fine or join logic needed
            organizer: e.metadata?.organizerName || 'Unknown', // Ideally join users table
        })) || []; // eslint-disable-line @typescript-eslint/no-explicit-any

        return NextResponse.json(mappedEvents);
    } catch (error) {
        console.error('Search API Failed:', error);
        return NextResponse.json(
            { error: 'Search failed' },
            { status: 500 }
        );
    }
}
