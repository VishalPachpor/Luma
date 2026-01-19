/**
 * Invite Service
 * Manages event invitations via email using Resend API
 */

import {
    collection,
    doc,
    setDoc,
    getDocs,
    updateDoc,
    query,
    where,
    serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';

export interface EventInvite {
    id: string;
    eventId: string;
    email: string;
    sentBy: string;
    sentByName: string;
    status: 'pending' | 'accepted' | 'declined';
    sentAt: Date;
}

/**
 * Send invite email via API
 */
export async function sendInviteEmail(
    eventId: string,
    eventTitle: string,
    recipientEmail: string,
    senderInfo: { uid: string; name: string; email: string }
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch('/api/invites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId,
                eventTitle,
                recipientEmail,
                senderName: senderInfo.name,
                senderEmail: senderInfo.email,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error };
        }

        // Save invite to Firestore
        if (db && isFirebaseConfigured) {
            const inviteRef = doc(collection(db, 'events', eventId, 'invites'));
            await setDoc(inviteRef, {
                eventId,
                email: recipientEmail,
                sentBy: senderInfo.uid,
                sentByName: senderInfo.name,
                status: 'pending',
                sentAt: serverTimestamp(),
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Error sending invite:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send invite'
        };
    }
}

/**
 * Get all invites for an event
 */
export async function getEventInvites(eventId: string): Promise<EventInvite[]> {
    if (!db || !isFirebaseConfigured) {
        return [];
    }

    try {
        const invitesRef = collection(db, 'events', eventId, 'invites');
        const snapshot = await getDocs(invitesRef);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            sentAt: doc.data().sentAt?.toDate() || new Date(),
        })) as EventInvite[];
    } catch (error) {
        console.error('Error getting invites:', error);
        return [];
    }
}

/**
 * Update invite status (when user accepts/declines)
 */
export async function updateInviteStatus(
    eventId: string,
    inviteId: string,
    status: 'accepted' | 'declined'
): Promise<void> {
    if (!db || !isFirebaseConfigured) {
        return;
    }

    const inviteRef = doc(db, 'events', eventId, 'invites', inviteId);
    await updateDoc(inviteRef, { status });
}
