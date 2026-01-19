/**
 * Event Service
 * Fetches all events for browsing
 */

import * as eventRepo from '@/lib/repositories/event.repository';
import type { Event } from '@/types';

/**
 * Get all upcoming events
 */
export async function getEvents(): Promise<Event[]> {
    try {
        const events = await eventRepo.findAll();
        return events;
    } catch (error) {
        console.error('[EventService] Failed to fetch events:', error);
        return [];
    }
}

/**
 * Get event by ID
 */
export async function getEventById(eventId: string): Promise<Event | null> {
    try {
        return await eventRepo.findById(eventId);
    } catch (error) {
        console.error('[EventService] Failed to fetch event:', error);
        return null;
    }
}
