/**
 * Calendar Subscription Service
 * Manages user subscriptions to calendars via Calendar Repository
 */

import * as calendarRepo from '@/lib/repositories/calendar.repository';

export interface CalendarSubscription {
    userId: string;
    calendarId: string;
    subscribedAt: Date;
}

/**
 * Subscribe user to a calendar
 */
export async function subscribeToCalendar(userId: string, calendarId: string): Promise<void> {
    await calendarRepo.subscribe({
        calendarId,
        notifyNewEvents: true,
        notifyReminders: true
    }, userId);
}

/**
 * Unsubscribe user from a calendar
 */
export async function unsubscribeFromCalendar(userId: string, calendarId: string): Promise<void> {
    await calendarRepo.unsubscribe(calendarId, userId);
}

/**
 * Get all calendars a user is subscribed to
 */
export async function getUserSubscriptions(userId: string): Promise<string[]> {
    const calendars = await calendarRepo.findSubscriptions(userId);
    return calendars.map(c => c.id);
}

/**
 * Check if user is subscribed to a specific calendar
 */
export async function isSubscribed(userId: string, calendarId: string): Promise<boolean> {
    return calendarRepo.isSubscribed(calendarId, userId);
}
