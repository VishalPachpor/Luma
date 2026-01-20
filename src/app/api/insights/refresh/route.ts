/**
 * Insights Refresh API
 * POST /api/insights/refresh
 * Manually triggers insights refresh for a calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { calendarId } = await request.json();

        if (!calendarId) {
            return NextResponse.json(
                { error: 'calendarId is required' },
                { status: 400 }
            );
        }

        // Verify user is authenticated
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adminSupabase = getServiceSupabase() as any;

        // Verify user owns this calendar
        const { data: calendar, error: calendarError } = await adminSupabase
            .from('calendars')
            .select('id, owner_id')
            .eq('id', calendarId)
            .single();

        if (calendarError || !calendar) {
            return NextResponse.json(
                { error: 'Calendar not found' },
                { status: 404 }
            );
        }

        if (calendar.owner_id !== user.id) {
            return NextResponse.json(
                { error: 'Not authorized to refresh this calendar\'s insights' },
                { status: 403 }
            );
        }

        // Call the refresh function
        const { error: refreshError } = await adminSupabase.rpc(
            'refresh_calendar_insights',
            { p_calendar_id: calendarId }
        );

        if (refreshError) {
            console.error('[Insights Refresh] Error:', refreshError);
            return NextResponse.json(
                { error: 'Failed to refresh insights', details: refreshError.message },
                { status: 500 }
            );
        }

        // Fetch the updated insights
        const { data: insights, error: fetchError } = await adminSupabase
            .from('calendar_insights')
            .select('*')
            .eq('calendar_id', calendarId)
            .single();

        if (fetchError) {
            console.error('[Insights Refresh] Fetch error:', fetchError);
        }

        return NextResponse.json({
            success: true,
            message: 'Insights refreshed successfully',
            data: insights || null
        });

    } catch (error) {
        console.error('[Insights Refresh] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
