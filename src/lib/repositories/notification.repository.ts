/**
 * Notification Repository
 * Handles in-app notifications using Supabase
 */

import { supabase, getServiceSupabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

type Notification = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
type NotificationType = Notification['type'];

export interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message?: string;
    link?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Create a notification
 */
export async function createNotification(params: CreateNotificationParams): Promise<Notification | null> {
    try {
        const serviceSupabase = getServiceSupabase();

        const { data, error } = await serviceSupabase
            .from('notifications')
            .insert({
                user_id: params.userId,
                type: params.type,
                title: params.title,
                message: params.message || null,
                link: params.link || null,
                metadata: params.metadata || {},
            })
            .select()
            .single();

        if (error) {
            console.error('[NotificationRepo] Create failed:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('[NotificationRepo] Create error:', error);
        return null;
    }
}

/**
 * Get notifications for a user (paginated)
 */
export async function getNotifications(
    userId: string,
    limit: number = 20,
    unreadOnly: boolean = false
): Promise<Notification[]> {
    try {
        let query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (unreadOnly) {
            query = query.is('read_at', null);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[NotificationRepo] Get failed:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('[NotificationRepo] Get error:', error);
        return [];
    }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('read_at', null);

        if (error) {
            console.error('[NotificationRepo] Count failed:', error);
            return 0;
        }

        return count || 0;
    } catch (error) {
        console.error('[NotificationRepo] Count error:', error);
        return 0;
    }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
    try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase-browser');
        const supabase = createSupabaseBrowserClient();

        const { error } = await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', notificationId);

        return !error;
    } catch (error) {
        console.error('[NotificationRepo] Mark read error:', error);
        return false;
    }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
    try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase-browser');
        const supabase = createSupabaseBrowserClient();

        const { error } = await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .is('read_at', null);

        return !error;
    } catch (error) {
        console.error('[NotificationRepo] Mark all read error:', error);
        return false;
    }
}

/**
 * Send approval notification to a user
 */
export async function sendApprovalNotification(
    userId: string,
    eventId: string,
    eventTitle: string,
    approved: boolean,
    reason?: string
): Promise<Notification | null> {
    return createNotification({
        userId,
        type: approved ? 'approval_granted' : 'approval_rejected',
        title: approved
            ? `You're approved for ${eventTitle}!`
            : `Registration update for ${eventTitle}`,
        message: approved
            ? 'Your registration has been approved. See you there!'
            : reason || 'Unfortunately, your registration was not approved.',
        link: `/events/${eventId}`,
        metadata: { eventId, approved },
    });
}
