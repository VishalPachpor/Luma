/**
 * Permissions Service
 * Centralizes access control logic for events and resources.
 * Replaces ad-hoc checks in components and routes.
 */

import { supabase } from '@/lib/supabase';
import { adminDb } from '@/lib/firebase-admin';

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
        // 1. Check Supabase (Primary)
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

        // 2. Fallback to Firebase (Legacy/Dev)
        // Only run if adminDb is successfully initialized
        if (adminDb) {
            try {
                const doc = await adminDb.collection('events').doc(eventId).get();
                if (doc.exists) {
                    const data = doc.data();
                    if (data?.organizerId === userId) return true;
                }
            } catch (fbError) {
                // Ignore firebase errors in fallback path
                console.warn('[Permissions] Firebase fallback skipped:', fbError);
            }
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
    // Future: Check 'hosts' array or 'staff' role.
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
        canCheckIn: false, // Future: Staff logic
        canInvite: false,
        canViewAnalytics: false
    };
}
