/**
 * My Events Service
 * Fetches events the user has RSVP'd to using Guest Repository
 */

import type { Event } from '@/types';
import * as eventRepo from '@/lib/repositories/event.repository';
import * as guestRepo from '@/lib/repositories/guest.repository';

export interface MyEventEntry {
    event: Event;
    rsvpStatus: 'going' | 'interested' | 'pending';
    rsvpAt: Date;
}

/**
 * Get all events the user has RSVP'd to
 */
export async function getMyEvents(userId: string): Promise<MyEventEntry[]> {
    if (!userId) return [];

    try {
        const guests = await guestRepo.findGuestsByUser(userId);
        const myEvents: MyEventEntry[] = [];

        for (const guest of guests) {
            const event = await eventRepo.findById(guest.eventId);
            if (event) {
                // Map Guest Status to simple RSVP status
                let rsvpStatus: 'going' | 'interested' | 'pending' = 'pending';
                if (['issued', 'approved', 'scanned'].includes(guest.status)) {
                    rsvpStatus = 'going';
                }

                myEvents.push({
                    event,
                    rsvpStatus,
                    rsvpAt: new Date(guest.createdAt),
                });
            }
        }

        return myEvents;
    } catch (error) {
        console.error('[MyEvents] Error fetching events:', error);
        return [];
    }
}
