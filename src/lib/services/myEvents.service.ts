/**
 * My Events Service
 * Fetches events the user has RSVP'd to using denormalized user data
 */

import {
    collection,
    query,
    getDocs,
    orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/types';
import * as eventRepo from '@/lib/repositories/event.repository';

// Helper to safely parse dates (handles Firebase Timestamps and ISO strings)
function parseDate(value: any): Date {
    if (!value) return new Date();
    if (typeof value?.toDate === 'function') return value.toDate(); // Firebase Timestamp
    if (typeof value === 'string') return new Date(value); // ISO string
    if (value instanceof Date) return value;
    return new Date();
}

export interface MyEventEntry {
    event: Event;
    rsvpStatus: 'going' | 'interested' | 'pending';
    rsvpAt: Date;
}

/**
 * Get all events the user has RSVP'd to
 * Checks Supabase first (paid RSVPs), then Firebase (free/legacy)
 */
export async function getMyEvents(userId: string): Promise<MyEventEntry[]> {
    if (!userId) {
        console.log('[MyEvents] No userId provided');
        return [];
    }

    const myEvents: MyEventEntry[] = [];
    const seenEventIds = new Set<string>();

    // 1. Check Supabase first (paid RSVPs stored here)
    try {
        const { data: supabaseRsvps, error } = await supabase
            .from('rsvps')
            .select('*')
            .eq('user_id', userId);

        if (!error && supabaseRsvps && supabaseRsvps.length > 0) {
            console.log(`[MyEvents] Found ${supabaseRsvps.length} RSVPs in Supabase`);

            for (const rsvp of supabaseRsvps) {
                const event = await eventRepo.findById(rsvp.event_id);
                if (event) {
                    myEvents.push({
                        event,
                        rsvpStatus: (rsvp.status as 'going' | 'interested' | 'pending') || 'going',
                        rsvpAt: parseDate(rsvp.created_at),
                    });
                    seenEventIds.add(rsvp.event_id);
                }
            }
        }
    } catch (supabaseError) {
        console.warn('[MyEvents] Supabase check failed:', supabaseError);
    }

    // 2. Also check Firebase (Guest Collection)
    if (db && isFirebaseConfigured) {
        try {
            const guests = await import('@/lib/repositories/guest.repository').then(repo => repo.findGuestsByUser(userId));
            console.log(`[MyEvents] Found ${guests.length} guests in Firestore`);

            for (const guest of guests) {
                // Skip if already found in Supabase (avoid duplicates)
                if (seenEventIds.has(guest.eventId)) continue;

                const event = await eventRepo.findById(guest.eventId);
                if (event) {
                    myEvents.push({
                        event,
                        rsvpStatus: (guest.status === 'issued' || guest.status === 'scanned') ? 'going' : 'pending',
                        rsvpAt: new Date(guest.createdAt),
                    });
                    seenEventIds.add(guest.eventId);
                }
            }
        } catch (error: any) {
            console.error('[MyEvents] Firestore error:', error);
        }
    }

    console.log(`[MyEvents] Returning ${myEvents.length} total events`);
    return myEvents;
}

