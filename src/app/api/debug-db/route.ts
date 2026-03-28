import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
    // Only available in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', userId);

    const { data: rsvps, error: rsvpsError } = await supabase
        .from('rsvps')
        .select('*')
        .eq('user_id', userId);

    return NextResponse.json({
        targetUserId: userId,
        eventsCount: events?.length ?? 0,
        events,
        eventsError,
        rsvpsCount: rsvps?.length ?? 0,
        rsvps,
        rsvpsError,
    });
}
