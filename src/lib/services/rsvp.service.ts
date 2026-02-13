/**
 * RSVP Service
 * Manages event registrations and attendee tracking
 * Uses Supabase via Guest Repository
 */

import * as guestRepo from '@/lib/repositories/guest.repository';
import { supabase } from '@/lib/supabase';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export type RSVPStatus = 'going' | 'interested' | 'pending';

export interface EventAttendee {
    userId: string;
    displayName: string;
    photoURL: string | null;
    email: string;
    status: RSVPStatus;
    rsvpAt: Date;
    answers?: Record<string, string | string[]>; // questionId -> answer
}

/**
 * RSVP to an event
 */
export async function rsvpToEvent(
    eventId: string,
    userId: string,
    userInfo: { displayName: string; photoURL: string | null; email: string },
    status: RSVPStatus = 'going',
    answers?: Record<string, string | string[]>
): Promise<void> {
    try {
        const guestStatus = status === 'going' ? 'issued' : 'pending_approval';
        await guestRepo.createGuest(eventId, userId, 'default', guestStatus as any);
        console.log(`[RSVP] User ${userId} registered for event ${eventId}`);
    } catch (error) {
        console.error('[RSVP] Error registering for event:', error);
        throw error;
    }
}

/**
 * Cancel RSVP (remove from attendees)
 */
export async function cancelRSVP(eventId: string, userId: string): Promise<void> {
    try {
        const supabaseBrowser = createSupabaseBrowserClient();
        const { error } = await supabaseBrowser
            .from('guests')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', userId);

        if (error) throw error;

        console.log(`[RSVP] User ${userId} canceled RSVP for event ${eventId}`);
    } catch (error) {
        console.error('[RSVP] Error canceling RSVP:', error);
        throw error;
    }
}

/**
 * Get user's RSVP status for an event
 */
export async function getUserRSVP(eventId: string, userId: string): Promise<EventAttendee | null> {
    try {
        const guest = await guestRepo.findGuestByUser(eventId, userId);

        if (!guest) return null;

        let status: RSVPStatus = 'pending';
        // Map GuestStatus
        if (['issued', 'approved', 'scanned', 'staked'].includes(guest.status)) {
            status = 'going';
        } else if (guest.status === 'pending_approval') {
            status = 'pending';
        } else {
            // declined/refunded
            return null;
        }

        return {
            userId: guest.userId,
            displayName: 'Guest',
            photoURL: null,
            email: '',
            status,
            rsvpAt: new Date(guest.createdAt),
            guestStatus: guest.status,
        } as any;

    } catch (error) {
        console.error('[RSVP] Error getting user RSVP:', error);
        return null;
    }
}

/**
 * Get all attendees for an event
 */
export async function getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    try {
        const guests = await guestRepo.getGuests(eventId);

        return guests.map(guest => ({
            userId: guest.userId,
            displayName: 'Guest',
            photoURL: null,
            email: '',
            status: ['issued', 'scanned', 'approved', 'staked'].includes(guest.status) ? 'going' : 'pending',
            rsvpAt: new Date(guest.createdAt),
        }));
    } catch (error) {
        console.error('Error getting attendees:', error);
        return [];
    }
}

/**
 * Get attendee count for an event
 */
export async function getAttendeeCount(eventId: string): Promise<number> {
    const attendees = await getEventAttendees(eventId);
    return attendees.length;
}

/**
 * Check if user has RSVP'd to an event
 */
export async function hasUserRSVP(eventId: string, userId: string): Promise<boolean> {
    const rsvp = await getUserRSVP(eventId, userId);
    return rsvp !== null;
}

/**
 * Update RSVP status
 */
export async function updateRSVPStatus(
    eventId: string,
    userId: string,
    status: RSVPStatus
): Promise<void> {
    console.warn('[RSVP] updateRSVPStatus not implemented for Supabase');
}
