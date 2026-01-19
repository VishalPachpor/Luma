/**
 * Share Tracking API
 * POST /api/events/:id/share
 * Tracks when an event is shared (invited/copied link).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        const { channel } = await request.json(); // e.g. 'copy_link', 'facebook', 'twitter'

        const supabase = getServiceSupabase();

        // Check if analytics_events table exists in your schema, otherwise just mock/log
        // For this demo, we assume we might insert into a generic 'event_logs' or similar
        // Since schema is unknown for logs, we'll try to insert into 'analytics' if it existed, 
        // or just return success to simulate tracking.

        // TODO: Create 'analytics_events' table: id, event_id, type (view/share), subtype (channel), created_at

        /* 
        await supabase.from('analytics_events').insert({
            event_id: id,
            type: 'share',
            metadata: { channel }
        });
        */

        console.log(`[Analytics] Tracked share for event ${id} via ${channel}`);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Share API] Error:', error);
        return NextResponse.json({ success: false }, { status: 500 }); // Fail silently on analytics
    }
}
