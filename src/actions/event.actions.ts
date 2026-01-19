/**
 * Event Actions
 * Server Actions for event mutations
 */

'use server';

import { revalidatePath } from 'next/cache';
import type { Event, CreateEventInput } from '@/types';
import * as eventRepo from '@/lib/repositories/event.repository';
import * as guestRepo from '@/lib/repositories/guest.repository';

/**
 * Register for an event
 * Uses GuestRepository for Dual-Write (Guests Collection + Attendees Array)
 * @param requireApproval - If true, user is placed in 'pending_approval' status
 */
/**
 * Register for an event
 * Uses Supabase Guests Table
 * @param requireApproval - If true, user is placed in 'pending_approval' status
 */
export async function registerForEvent(
    eventId: string,
    userId: string,
    requireApproval: boolean = false,
    registrationAnswers: Record<string, string | string[]> = {}
): Promise<{ success: boolean; error?: string; status?: string }> {
    try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        // Use Service Role Key for server-side admin operations (bypass RLS)
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
            throw new Error('Server configuration error');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { generateId } = await import('@/lib/utils');

        // 1. Check if event exists
        // Just select 'id' to verify existence. 'attendees' column does not exist in Supabase (it's attendee_count or joined table).
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('id')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            console.error('[registerForEvent] Event existence check failed:', eventError);
            throw new Error('Event does not exist');
        }

        // 2. Check duplicate/existing guest
        // We can upsert, but let's check first to throw "User already registered" if needed?
        // Or just Upsert?
        // Logic says "Check duplicate".
        const { data: existingGuest } = await supabase
            .from('guests')
            .select('id, status')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .single();

        if (existingGuest) {
            // Already registered
            // Maybe return success if already going?
            return { success: true, status: existingGuest.status };
        }

        // 3. Register Guest via Repository (Dual Write: Firestore + Supabase)
        // This ensures the Host Dashboard (reading Firestore) sees the guest immediately
        const initialStatus = requireApproval ? 'pending_approval' : 'issued';

        await guestRepo.createGuest(
            eventId,
            userId,
            'default',
            initialStatus
        );

        // 4. Update Supabase 'rsvps' table for redundancy/compatibility (Dual Persist)
        // rsvp.service.ts reads 'rsvps'.
        const rsvpStatus = requireApproval ? 'interested' : 'going'; // Map to RSVP status
        await supabase
            .from('rsvps')
            .upsert({
                user_id: userId,
                event_id: eventId,
                status: rsvpStatus,
                answers: registrationAnswers // Save answers!
            });

        // 5. Update Attendee Count
        // (Firestore updates automatically via array length, Supabase needs manual increment)
        const { data: currentEvent } = await supabase
            .from('events')
            .select('attendee_count')
            .eq('id', eventId)
            .single();

        if (currentEvent) {
            await supabase
                .from('events')
                .update({ attendee_count: (currentEvent.attendee_count || 0) + 1 })
                .eq('id', eventId);
        }

        revalidatePath(`/events/${eventId}`);
        revalidatePath('/api/events');

        return { success: true, status: initialStatus };
    } catch (error: any) {
        console.error('Registration failed:', error);
        return { success: false, error: error.message || 'Failed to register' };
    }
}

/**
 * Create a new event
 */
export async function createEvent(input: CreateEventInput): Promise<Event> {
    const event = await eventRepo.create(input);
    revalidatePath('/');
    revalidatePath('/api/events');
    return event;
}

/**
 * Delete an event
 */
export async function deleteEvent(id: string): Promise<boolean> {
    const success = await eventRepo.remove(id);
    if (success) {
        revalidatePath('/');
        revalidatePath('/api/events');
    }
    return success;
}

/**
 * Create event from form data (for use with forms)
 */
export async function createEventFromForm(formData: FormData): Promise<{ success: boolean; event?: Event; error?: string }> {
    try {
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const date = formData.get('date') as string;
        const location = formData.get('location') as string;
        const city = formData.get('city') as string;
        const organizer = formData.get('organizer') as string;
        const coverImage = formData.get('coverImage') as string;
        const tags = (formData.get('tags') as string)?.split(',').map(t => t.trim()) || [];

        if (!title) {
            return { success: false, error: 'Title is required' };
        }

        const event = await eventRepo.create({
            title,
            description: description || '',
            date: date || new Date().toISOString(),
            location: location || 'TBD',
            city: city || 'Unknown',
            coords: { lat: 0, lng: 0 },
            coverImage: coverImage || 'https://picsum.photos/seed/default/800/600',
            attendees: 0,
            tags,
            organizer: organizer || 'Anonymous',
            status: 'published',
            visibility: 'public',
        });

        revalidatePath('/');
        revalidatePath('/api/events');
        return { success: true, event };
    } catch (error) {
        return { success: false, error: 'Failed to create event' };
    }
}
