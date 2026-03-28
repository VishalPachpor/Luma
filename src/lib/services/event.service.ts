/**
 * Event Service
 * Fetches all events for browsing
 */

import * as eventRepo from '@/lib/repositories/event.repository';
import type { Event } from '@/types';

/**
 * Get all upcoming events.
 * Throws on error — callers must distinguish empty from failure.
 */
export async function getEvents(): Promise<Event[]> {
    return eventRepo.findAll();
}

/**
 * Get event by ID.
 * Returns null if not found, throws on unexpected errors.
 */
export async function getEventById(eventId: string): Promise<Event | null> {
    return eventRepo.findById(eventId);
}
