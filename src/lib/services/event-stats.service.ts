/**
 * Event Stats Service
 * Fetches real statistics for event management dashboard
 */

import * as guestRepository from '@/lib/repositories/guest.repository';

export interface EventStats {
    invitesSent: number;
    registered: number;
    approved: number;
    pending: number;
    checkedIn: number;
    views: number;
}

/**
 * Get statistics for an event
 */
export async function getEventStats(eventId: string): Promise<EventStats> {
    try {
        // Fetch all guests for this event
        const guests = await guestRepository.getGuests(eventId);

        // Calculate stats from guests data
        const stats: EventStats = {
            invitesSent: 0, // TODO: Implement invites table
            registered: guests.length,
            approved: guests.filter(g =>
                g.status === 'issued' || g.status === 'approved'
            ).length,
            pending: guests.filter(g =>
                g.status === 'pending_approval'
            ).length,
            checkedIn: guests.filter(g =>
                g.status === 'scanned'
            ).length,
            views: 0 // TODO: Implement analytics tracking
        };

        return stats;
    } catch (error) {
        console.error('[EventStats] Error fetching stats:', error);
        // Return zeros on error
        return {
            invitesSent: 0,
            registered: 0,
            approved: 0,
            pending: 0,
            checkedIn: 0,
            views: 0
        };
    }
}

/**
 * Get attendee count (quick helper)
 */
export async function getAttendeeCount(eventId: string): Promise<number> {
    const stats = await getEventStats(eventId);
    return stats.registered;
}
