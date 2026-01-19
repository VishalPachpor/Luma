/**
 * RSVP Service
 * Manages event registrations and attendee tracking
 * Uses Supabase as primary for paid RSVPs, Firebase as fallback for legacy/free
 */

import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    increment,
    updateDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';

// Helper to safely parse dates (handles Firebase Timestamps and ISO strings)
function parseDate(value: any): Date {
    if (!value) return new Date();
    if (typeof value?.toDate === 'function') return value.toDate(); // Firebase Timestamp
    if (typeof value === 'string') return new Date(value); // ISO string
    if (value instanceof Date) return value;
    return new Date();
}

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
    if (!db || !isFirebaseConfigured) {
        console.warn('Firebase not configured, RSVP not saved');
        return;
    }

    try {
        // 1. Write to event's attendees subcollection (for event-side queries)
        const attendeeRef = doc(db, 'events', eventId, 'attendees', userId);
        await setDoc(attendeeRef, {
            userId,
            displayName: userInfo.displayName,
            photoURL: userInfo.photoURL,
            email: userInfo.email,
            status,
            rsvpAt: serverTimestamp(),
            ...(answers ? { answers } : {})
        });

        // 2. DENORMALIZATION: Write to user's rsvps collection (for My Events queries)
        // This eliminates the need for collection group queries and indexes
        const userRsvpRef = doc(db, 'users', userId, 'rsvps', eventId);
        await setDoc(userRsvpRef, {
            eventId,
            status,
            rsvpAt: serverTimestamp(),
            ...(answers ? { answers } : {})
        });

        console.log(`[RSVP] User ${userId} registered for event ${eventId}`);

        // Try to update attendee count on the event (may fail for mock events)
        try {
            const eventRef = doc(db, 'events', eventId);
            await updateDoc(eventRef, {
                attendees: increment(1),
            });
        } catch (updateError: any) {
            // If event doesn't exist in Firestore (mock event), that's okay
            if (updateError?.code !== 'not-found') {
                console.warn('[RSVP] Could not update attendee count:', updateError?.message);
            }
        }
    } catch (error) {
        console.error('[RSVP] Error registering for event:', error);
        throw error;
    }
}

/**
 * Cancel RSVP (remove from attendees)
 */
export async function cancelRSVP(eventId: string, userId: string): Promise<void> {
    if (!db || !isFirebaseConfigured) {
        console.warn('Firebase not configured');
        return;
    }

    try {
        // 1. Delete from event's attendees subcollection
        const attendeeRef = doc(db, 'events', eventId, 'attendees', userId);
        await deleteDoc(attendeeRef);

        // 2. DENORMALIZATION: Delete from user's rsvps collection
        const userRsvpRef = doc(db, 'users', userId, 'rsvps', eventId);
        await deleteDoc(userRsvpRef);

        console.log(`[RSVP] User ${userId} canceled RSVP for event ${eventId}`);

        // Try to decrement attendee count (may fail for mock events)
        try {
            const eventRef = doc(db, 'events', eventId);
            await updateDoc(eventRef, {
                attendees: increment(-1),
            });
        } catch (updateError: any) {
            // If event doesn't exist in Firestore (mock event), that's okay
            if (updateError?.code !== 'not-found') {
                console.warn('[RSVP] Could not update attendee count:', updateError?.message);
            }
        }
    } catch (error) {
        console.error('[RSVP] Error canceling RSVP:', error);
        throw error;
    }
}

/**
 * Get user's RSVP status for an event
 * Checks Guests collection first (Luma Architecture), then Supabase, then Firebase legacy
 */
export async function getUserRSVP(eventId: string, userId: string): Promise<EventAttendee | null> {
    // 1. Check Guests collection first (Luma Architecture - primary source of truth)
    try {
        const guestRepo = await import('@/lib/repositories/guest.repository');
        const guest = await guestRepo.findGuestByUser(eventId, userId);

        if (guest) {
            // Map GuestStatus to RSVPStatus for UI compatibility
            let status: RSVPStatus = 'pending';
            if (guest.status === 'issued' || guest.status === 'approved' || guest.status === 'scanned') {
                status = 'going';
            } else if (guest.status === 'pending_approval') {
                status = 'pending'; // Will show "Awaiting Approval" in UI
            }

            console.log('[RSVP] Found in Guests:', guest.status, '-> mapped to', status);
            return {
                userId: guest.userId,
                displayName: 'Guest',
                photoURL: null,
                email: '',
                status,
                rsvpAt: new Date(guest.createdAt),
                guestStatus: guest.status as string, // Pass original status for detailed UI
            } as EventAttendee & { guestStatus?: string };
        }
    } catch (guestError) {
        console.warn('[RSVP] Guest check failed:', guestError);
    }

    // 2. Check Supabase (paid RSVPs)
    try {
        const { data: supabaseRsvp, error } = await supabase
            .from('rsvps')
            .select('*')
            .eq('user_id', userId)
            .eq('event_id', eventId)
            .maybeSingle();

        if (!error && supabaseRsvp) {
            console.log('[RSVP] Found in Supabase:', supabaseRsvp.status);
            return {
                userId: supabaseRsvp.user_id,
                displayName: '',
                photoURL: null,
                email: '',
                status: supabaseRsvp.status as RSVPStatus,
                rsvpAt: new Date(supabaseRsvp.created_at),
            };
        }
    } catch (supabaseError) {
        console.warn('[RSVP] Supabase check failed:', supabaseError);
    }

    // 3. Fall back to Firebase attendees (legacy)
    if (!db || !isFirebaseConfigured) {
        return null;
    }

    try {
        const attendeeRef = doc(db, 'events', eventId, 'attendees', userId);
        const snapshot = await getDoc(attendeeRef);

        if (!snapshot.exists()) {
            return null;
        }

        return snapshot.data() as EventAttendee;
    } catch (error) {
        console.error('Error getting RSVP from Firebase:', error);
        return null;
    }
}

/**
 * Get all attendees for an event
 */
/**
 * Get all attendees for an event
 * Migrated to use GuestRepository (Luma Architecture)
 */
export async function getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    if (!db || !isFirebaseConfigured) {
        return [];
    }

    try {
        // Use GuestRepository to fetch from 'guests' collection
        const guests = await import('@/lib/repositories/guest.repository').then(repo => repo.getGuests(eventId));

        // Map Guest enitity to EventAttendee interface for backward compatibility
        return guests.map(guest => ({
            userId: guest.userId,
            displayName: 'Guest', // TODO: Fetch user profile or denormalize name onto Guest
            photoURL: null,
            email: '',
            status: (guest.status === 'issued' || guest.status === 'scanned') ? 'going' : 'pending',
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
    if (!db || !isFirebaseConfigured) {
        console.warn('Firebase not configured');
        return;
    }

    const attendeeRef = doc(db, 'events', eventId, 'attendees', userId);
    await updateDoc(attendeeRef, { status });
}
