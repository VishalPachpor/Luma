/**
 * Permissions Service
 * Centralizes access control logic for events and resources.
 * Replaces ad-hoc checks in components and routes.
 */

import { supabase } from '@/lib/supabase';

export interface UserPermissions {
    canEdit: boolean;
    canCheckIn: boolean;
    canInvite: boolean;
    canViewAnalytics: boolean;
}

/**
 * Check if a user has management permissions for an event
 */
export async function canManageEvent(userId: string, eventId: string): Promise<boolean> {
    if (!userId || !eventId) return false;

    try {
        // Check Supabase (Primary)
        // Check if organizer OR in event_hosts
        const { data: event, error } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', eventId)
            .single();

        if (!error && event) {
            if (event.organizer_id === userId) return true;

            // Check if host
            const { data: hostEntry } = await supabase
                .from('event_hosts' as any)
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', userId)
                .maybeSingle();

            if (hostEntry) return true;
        }

        return false;
    } catch (error) {
        console.error('[Permissions] Error checking management permission:', error);
        return false;
    }
}

/**
 * Check if a user can check in guests
 * (Organizer, Hosts, or Staff)
 */
export async function canCheckInGuest(userId: string, eventId: string): Promise<boolean> {
    // For now, only organizers can check in.
    return canManageEvent(userId, eventId);
}

/**
 * Get all permissions for a user on an event
 */
export async function getEventPermissions(userId: string, eventId: string): Promise<UserPermissions> {
    const isOrganizer = await canManageEvent(userId, eventId);

    // If organizer, they can do everything
    if (isOrganizer) {
        return {
            canEdit: true,
            canCheckIn: true,
            canInvite: true,
            canViewAnalytics: true
        };
    }

    // Default: No permissions
    return {
        canEdit: false,
        canCheckIn: false,
        canInvite: false,
        canViewAnalytics: false
    };
}
