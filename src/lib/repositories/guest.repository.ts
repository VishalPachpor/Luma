import {
    collection,
    collectionGroup,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    runTransaction,
    Timestamp,
    updateDoc
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { Guest, GuestStatus } from '@/types/commerce';
import { generateId } from '@/lib/utils';
// Use Browser Client for Client-side Auth/RLS
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const EVENTS_COLLECTION = 'events';
const GUESTS_SUBCOLLECTION = 'guests';

// Create helper to get client (lazy or instance)
// Since this is a module, we can instantiate it. 
// Note: verify if this breaks server usage (if any).
// But standard pattern is:
const getSupabase = () => createSupabaseBrowserClient();

/**
 * Guest Repository
 * Handles guest/attendee entities with Dual-Write to support legacy array
 */

/**
 * Create a new guest (Register for event)
 * Implements Dual-Write:
 * 1. Creates Guest document in events/{eventId}/guests/{guestId}
 * 2. Adds userId to events/{eventId}.attendees array (Legacy)
 */
export async function createGuest(
    eventId: string,
    userId: string,
    ticketTierId: string = 'default',
    initialStatus: GuestStatus = 'issued',
    orderId: string = 'manual'
): Promise<Guest> {
    const guestId = generateId();
    const newGuest: Guest = {
        id: guestId,
        orderId,
        eventId,
        ticketTierId,
        userId: userId,
        qrToken: generateId(),
        status: initialStatus,
        createdAt: new Date().toISOString(),
    };

    if (!db || !isFirebaseConfigured) {
        // Supabase Implementation
        const { error } = await getSupabase()
            .from('guests')
            .insert({
                id: guestId,
                event_id: eventId,
                user_id: userId,
                status: initialStatus,
                ticket_tier_id: ticketTierId === 'default' ? null : ticketTierId,
                order_id: orderId === 'manual' ? null : orderId,
                qr_token: newGuest.qrToken,
                created_at: newGuest.createdAt,
            });

        if (error) {
            console.error('[GuestRepo] Supabase insert failed:', error);
            throw new Error(error.message);
        }

        return newGuest;
    }

    // Firebase Implementation (Primary)
    const guestRef = doc(db, EVENTS_COLLECTION, eventId, GUESTS_SUBCOLLECTION, guestId);
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);

    try {
        await runTransaction(db, async (transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) {
                throw new Error('Event does not exist');
            }

            const eventData = eventSnap.data();
            const attendees = eventData.attendees || [];

            if (attendees.includes(userId)) {
                // Check if we should allow re-registration or throw?
                // For now, fail to prevent duplicates.
                throw new Error('User already registered');
            }

            transaction.set(guestRef, {
                ...newGuest,
                createdAt: serverTimestamp(),
            });

            transaction.update(eventRef, {
                attendees: [...attendees, userId]
            });
        });

        // Dual-Write: Also write to Supabase (Best Effort)
        try {
            const { error: supaError } = await getSupabase()
                .from('guests')
                .insert({
                    id: guestId,
                    event_id: eventId,
                    user_id: userId,
                    status: initialStatus,
                    ticket_tier_id: ticketTierId === 'default' ? null : ticketTierId,
                    order_id: orderId === 'manual' ? null : orderId,
                    qr_token: newGuest.qrToken,
                    created_at: newGuest.createdAt,
                });

            if (supaError) console.warn('[GuestRepo] Supabase dual-write failed:', supaError);
        } catch (swError) {
            console.warn('[GuestRepo] Supabase dual-write exception:', swError);
        }

        return newGuest;
    } catch (error) {
        console.error('[GuestRepo] Registration failed:', error);
        throw error;
    }
}

/**
 * Find guest by User ID and Event ID
 */
export async function findGuestByUser(eventId: string, userId: string): Promise<Guest | null> {
    if (!db || !isFirebaseConfigured) {
        // Supabase Implementation
        const { data, error } = await getSupabase()
            .from('guests')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('[GuestRepo] Supabase find failed:', error);
            return null;
        }

        return data ? normalizeSupabaseGuest(data) : null;
    }

    try {
        const guestsRef = collection(db, EVENTS_COLLECTION, eventId, GUESTS_SUBCOLLECTION);
        const q = query(guestsRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        return normalizeGuest(doc);
    } catch (error) {
        console.error('[GuestRepo] Find guest failed:', error);
        return null;
    }
}

function normalizeSupabaseGuest(data: any): Guest {
    return {
        id: data.id,
        orderId: data.order_id || 'manual',
        eventId: data.event_id,
        ticketTierId: data.ticket_tier_id || 'default',
        userId: data.user_id,
        qrToken: data.qr_token || '',
        status: data.status as GuestStatus,
        createdAt: data.created_at,
        checkedInAt: data.checked_in_at,
    };
}

function normalizeGuest(doc: any): Guest {
    const data = doc.data ? doc.data() : doc;
    return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
    } as Guest;
}

/**
 * Get all guests for an event
 */
export async function getGuests(eventId: string): Promise<Guest[]> {
    if (!db || !isFirebaseConfigured) {
        // Supabase Implementation
        const { data, error } = await getSupabase()
            .from('guests')
            .select('*')
            .eq('event_id', eventId);

        if (error) {
            console.error('[GuestRepo] Supabase getGuests failed:', error);
            return [];
        }

        return (data || []).map(normalizeSupabaseGuest);
    }

    try {
        const guestsRef = collection(db, EVENTS_COLLECTION, eventId, GUESTS_SUBCOLLECTION);
        const snapshot = await getDocs(guestsRef);
        return snapshot.docs.map(doc => normalizeGuest(doc));
    } catch (error) {
        console.error('[GuestRepo] Get guests failed:', error);
        return [];
    }
}

/**
 * Find all guests by User ID (across all events)
 */
export async function findGuestsByUser(userId: string): Promise<Guest[]> {
    if (!db || !isFirebaseConfigured) {
        // Supabase Implementation
        const { data, error } = await getSupabase()
            .from('guests')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('[GuestRepo] Supabase findGuestsByUser failed:', error);
            return [];
        }

        return (data || []).map(normalizeSupabaseGuest);
    }

    try {
        const guestsQuery = query(
            collectionGroup(db, GUESTS_SUBCOLLECTION),
            where('userId', '==', userId)
        );
        const snapshot = await getDocs(guestsQuery);
        return snapshot.docs.map(doc => normalizeGuest(doc));
    } catch (error) {
        console.error('[GuestRepo] Find guests by user failed:', error);
        return [];
    }
}

/**
 * Find guest by QR Token (for check-in)
 */
export async function findByQrToken(eventId: string, qrToken: string): Promise<Guest | null> {
    if (!db || !isFirebaseConfigured) {
        // Supabase
        const { data, error } = await getSupabase()
            .from('guests')
            .select('*')
            .eq('event_id', eventId)
            .eq('qr_token', qrToken)
            .maybeSingle();

        return data ? normalizeSupabaseGuest(data) : null;
    }

    try {
        const guestsRef = collection(db, EVENTS_COLLECTION, eventId, GUESTS_SUBCOLLECTION);
        const q = query(guestsRef, where('qrToken', '==', qrToken));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        return normalizeGuest(snapshot.docs[0]);
    } catch (error) {
        console.error('[GuestRepo] Find by QR token failed:', error);
        return null;
    }
}

/**
 * Check in a guest (mark as scanned)
 */
export async function checkIn(eventId: string, guestId: string): Promise<{ success: boolean; alreadyScanned: boolean; error?: string }> {
    if (!db || !isFirebaseConfigured) {
        // Supabase check-in
        const { data: guest, error: fetchError } = await getSupabase()
            .from('guests')
            .select('*')
            .eq('id', guestId)
            .eq('event_id', eventId)
            .single();

        if (fetchError || !guest) {
            return { success: false, alreadyScanned: false, error: 'Guest not found' };
        }

        if (guest.status === 'scanned') {
            return { success: true, alreadyScanned: true };
        }

        if (guest.status !== 'issued') {
            return { success: false, alreadyScanned: false, error: `Invalid ticket status: ${guest.status}` };
        }

        const { error: updateError } = await getSupabase()
            .from('guests')
            .update({
                status: 'scanned',
                checked_in_at: new Date().toISOString()
            })
            .eq('id', guestId);

        if (updateError) {
            return { success: false, alreadyScanned: false, error: updateError.message };
        }

        return { success: true, alreadyScanned: false };
    }

    try {
        const guestRef = doc(db, EVENTS_COLLECTION, eventId, GUESTS_SUBCOLLECTION, guestId);
        const guestSnap = await getDoc(guestRef);

        if (!guestSnap.exists()) {
            return { success: false, alreadyScanned: false, error: 'Guest not found' };
        }

        const guest = guestSnap.data() as Guest;

        if (guest.status === 'scanned') {
            return { success: true, alreadyScanned: true };
        }

        if (guest.status !== 'issued') {
            return { success: false, alreadyScanned: false, error: `Invalid ticket status: ${guest.status}` };
        }

        await updateDoc(guestRef, {
            status: 'scanned' as GuestStatus,
            checkedInAt: serverTimestamp()
        });

        return { success: true, alreadyScanned: false };
    } catch (error) {
        console.error('[GuestRepo] Check-in failed:', error);
        return { success: false, alreadyScanned: false, error: 'Check-in failed' };
    }
}
