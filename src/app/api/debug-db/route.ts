import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Default to the user ID we saw in logs if not provided
    const targetUserId = userId || 'abf4af53-cefe-43ac-aab0-82219abc3765';

    const supabase = getServiceSupabase();

    // Check Events hosted by this user
    const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', targetUserId);

    // Check RSVPs for this user
    const { data: rsvps, error: rsvpsError } = await supabase
        .from('rsvps')
        .select('*')
        .eq('user_id', targetUserId);

    return NextResponse.json({
        targetUserId,
        eventsCount: events?.length,
        events: events,
        eventsError,
        rsvpsCount: rsvps?.length,
        rsvps: rsvps,
        rsvpsError
    });
}
