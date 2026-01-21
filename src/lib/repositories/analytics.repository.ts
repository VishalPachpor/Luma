
import { getServiceSupabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

type AnalyticsEvent = Database['public']['Tables']['event_analytics']['Insert'];

export const recordView = async (
    eventId: string,
    params: {
        userId?: string;
        sessionId?: string;
        referrer?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
    }
) => {
    const supabase = getServiceSupabase();

    const data: AnalyticsEvent = {
        event_id: eventId,
        metric: 'view',
        value: 1,
        user_id: params.userId || null,
        session_id: params.sessionId || null,
        referrer: params.referrer || null,
        user_agent: params.userAgent || null,
        metadata: params.metadata || {},
    };

    const { error } = await supabase
        .from('event_analytics')
        .insert(data);

    if (error) {
        console.error('[Analytics] Failed to record view:', error);
        // We don't throw here to avoid blocking the UI
    }
};

export const getUniqueViews = async (eventId: string): Promise<number> => {
    const supabase = getServiceSupabase();

    // For Phase 1, we just return total views count as unique views approximation
    // or we can just fetch total count.

    const { count, error } = await supabase
        .from('event_analytics')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('metric', 'view');

    if (error) {
        console.error('[Analytics] Failed to get views:', error);
        return 0;
    }

    return count || 0;
};

export const getDashboardStats = async (eventId: string) => {
    const supabase = getServiceSupabase();

    // 1. Get Views
    const { count: totalViews } = await supabase
        .from('event_analytics')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('metric', 'view');

    // 2. Get Invites & RSVPs directly from event counters if available
    // or queries.

    const { data: event } = await supabase
        .from('events')
        .select('counters, attendee_count')
        .eq('id', eventId)
        .single();

    const counters = (event?.counters as any) || {};

    return {
        totalViews: totalViews || 0,
        uniqueViews: totalViews || 0, // Placeholder
        invitesSent: counters.invites_sent || 0,
        registrations: event?.attendee_count || 0,
    };
};
