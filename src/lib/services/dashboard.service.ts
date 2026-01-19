/**
 * Dashboard Service
 * Aggregates data for the Event Management Dashboard.
 * Follows Luma's pattern of pre-aggregated fetching.
 */

import { getServiceSupabase } from '@/lib/supabase';
import { getEventStats } from '@/lib/services/event-stats.service';
import { getEventPermissions, UserPermissions } from '@/lib/services/permissions.service';
import { Event } from '@/types';

export interface DashboardData {
    event: {
        id: string;
        title: string;
        description: string;
        coverImage: string;
        startTime: string;
        endTime?: string;
        location: string;
        city: string;
        hostId: string;
        organizerName: string;
        status: string;
        visibility: string;
    } | null;
    stats: {
        invitesSent: number;
        registrations: number;
        approved: number;
        views: number;
    };
    rsvp: {
        total: number;
        checkedIn: number;
    };
    permissions: UserPermissions;
}

export async function getDashboardData(eventId: string, userId: string): Promise<DashboardData | null> {
    try {
        const supabase = getServiceSupabase();

        // 1. Fetch Basic Event Data & Permissions Parallel
        // We use Promise.all to maximize concurrency
        const [eventResult, permissions] = await Promise.all([
            supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single(),
            getEventPermissions(userId, eventId)
        ]);

        const { data: event, error: eventError } = eventResult;

        if (eventError || !event) {
            console.error('[DashboardService] Event not found:', eventError);
            return null;
        }

        // 2. Fetch Stats (Counts)
        // This abstracts the complexity of counting guests/rsvps
        const stats = await getEventStats(eventId);

        // 3. Construct Data Object
        // Luma-style flat/grouped structure
        return {
            event: {
                id: event.id,
                title: event.title,
                description: event.description || '',
                coverImage: event.cover_image || '',
                startTime: event.date,
                endTime: event.end_date || undefined,
                location: event.location || 'Online',
                city: event.city || '',
                hostId: event.organizer_id,
                organizerName: event.organizer_name || 'Host',
                status: event.status || 'published',
                visibility: event.visibility || 'public'
            },
            stats: {
                invitesSent: stats.invitesSent,
                registrations: stats.registered,
                approved: stats.approved,
                views: stats.views
            },
            rsvp: {
                total: stats.registered,
                checkedIn: stats.checkedIn
            },
            permissions
        };

    } catch (error) {
        console.error('[DashboardService] Error aggregating data:', error);
        throw error;
    }
}
