/**
 * Calendar Subscription Service
 * Manages user subscriptions to calendars via Firestore
 */

import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';

export interface CalendarSubscription {
    userId: string;
    calendarId: string;
    subscribedAt: Date;
}

/**
 * Subscribe user to a calendar
 */
export async function subscribeToCalendar(userId: string, calendarId: string): Promise<void> {
    if (!db || !isFirebaseConfigured) {
        console.warn('Firebase not configured, subscription not saved');
        return;
    }

    const subscriptionRef = doc(db, 'subscriptions', `${userId}_${calendarId}`);
    await setDoc(subscriptionRef, {
        userId,
        calendarId,
        subscribedAt: serverTimestamp(),
    });
}

/**
 * Unsubscribe user from a calendar
 */
export async function unsubscribeFromCalendar(userId: string, calendarId: string): Promise<void> {
    if (!db || !isFirebaseConfigured) {
        console.warn('Firebase not configured');
        return;
    }

    const subscriptionRef = doc(db, 'subscriptions', `${userId}_${calendarId}`);
    await deleteDoc(subscriptionRef);
}

/**
 * Get all calendars a user is subscribed to
 */
export async function getUserSubscriptions(userId: string): Promise<string[]> {
    if (!db || !isFirebaseConfigured) {
        console.warn('Firebase not configured');
        return [];
    }

    const subscriptionsRef = collection(db, 'subscriptions');
    const q = query(subscriptionsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => doc.data().calendarId);
}

/**
 * Check if user is subscribed to a specific calendar
 */
export async function isSubscribed(userId: string, calendarId: string): Promise<boolean> {
    const subscriptions = await getUserSubscriptions(userId);
    return subscriptions.includes(calendarId);
}
