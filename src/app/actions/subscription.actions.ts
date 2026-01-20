'use server';

import * as calendarRepo from '@/lib/repositories/calendar.repository';
import { revalidatePath } from 'next/cache';

/**
 * Subscribe user to a calendar
 */
export async function subscribeToCalendarAction(userId: string, calendarId: string) {
    try {
        await calendarRepo.subscribe({
            calendarId,
            notifyNewEvents: true,
            notifyReminders: true
        }, userId);

        console.log(`[Server] Successfully subscribed user ${userId} to calendar ${calendarId}`);
        revalidatePath('/'); // Revalidate home page to show updated subscription status if needed
        return { success: true };
    } catch (error) {
        console.error('Subscribe action failed:', error);
        throw new Error('Failed to subscribe');
    }
}

/**
 * Unsubscribe user from a calendar
 */
export async function unsubscribeFromCalendarAction(userId: string, calendarId: string) {
    try {
        await calendarRepo.unsubscribe(calendarId, userId);
        console.log(`[Server] Successfully unsubscribed user ${userId} from calendar ${calendarId}`);
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Unsubscribe action failed:', error);
        throw new Error('Failed to unsubscribe');
    }
}

/**
 * Check if user is subscribed to a specific calendar
 */
export async function checkSubscriptionStatus(userId: string, calendarId: string): Promise<boolean> {
    try {
        return await calendarRepo.isSubscribed(calendarId, userId);
    } catch (error) {
        console.error('Check subscription status failed:', error);
        return false;
    }
}
