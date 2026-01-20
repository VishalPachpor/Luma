/**
 * Dashboard Aggregation API
 * GET /api/events/:id/dashboard
 * Aggregates Event, Stats, RSVP, and Permission data for the Organizer Dashboard.
 * Replaces multiple client-side calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getDashboardData } from '@/lib/services/dashboard.service';
import { getEventPermissions } from '@/lib/services/permissions.service';
import { getEventStats } from '@/lib/services/event-stats.service';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        // 1. Auth Check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            // In a real app we'd block here, but for dev/layout work we might allow partial data?
            // No, dashboard is sensitive.
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        const supabase = getServiceSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Fetch Event & Permissions Parallel
        const [eventResult, permissions] = await Promise.all([
            supabase
                .from('events')
                .select('*')
                .eq('id', id)
                .single(),
            getEventPermissions(user.id, id)
        ]);

        const { data: eventData, error: eventError } = eventResult;
        const event = eventData as {
            id: string;
            title: string;
            cover_image: string | null;
            date: string;
            end_date: string | null;
            location: string | null;
            organizer_id: string;
            status: string;
            visibility: string;
        } | null;

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // 3. Check Access
        if (!permissions.canEdit && !permissions.canViewAnalytics) { // Basic access check
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 4. Aggregation (Parallel Fetching of Sub-resources)
        // Fetch stats, RSVP counts, checking status
        const [statsResult, rsvpCounts] = await Promise.all([
            getEventStats(id),
            // Example of a specific aggregation query if not in stats service
            supabase
                .from('guests')
                .select('status, count') // Pseudo-query, actually need group by
                .eq('event_id', id)
        ]);

        // Refine RSVP/Guest counts from direct query if stats service is mock
        // For now, rely on stats service as it's being built out

        const responseData = {
            event: {
                id: event.id,
                title: event.title,
                coverImage: event.cover_image,
                startTime: event.date,
                endTime: event.end_date,
                location: event.location,
                hostId: event.organizer_id,
                status: event.status,
                visibility: event.visibility
            },
            stats: {
                invitesSent: statsResult.invitesSent, // From service
                registrations: statsResult.registered,
                approved: statsResult.approved,
                views: statsResult.views // Mock for now
            },
            rsvp: {
                total: statsResult.registered,
                checkedIn: statsResult.checkedIn
            },
            permissions: permissions
        };

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('[Dashboard API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
