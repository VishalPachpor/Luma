/**
 * Calendar Service
 * Fetches featured calendars
 */

import * as calendarRepo from '@/lib/repositories/calendar.repository';
import type { Calendar } from '@/types';

/**
 * Get featured calendars (popular calendars)
 */
export async function getFeaturedCalendars(): Promise<Calendar[]> {
    return calendarRepo.findPopular();
}

/**
 * Get calendar by ID
 */
export async function getCalendarById(calendarId: string): Promise<Calendar | null> {
    return calendarRepo.findById(calendarId);
}
