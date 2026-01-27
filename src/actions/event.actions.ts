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

        // 1. Check if event exists and get price
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('id, price, require_approval')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            console.error('[registerForEvent] Event existence check failed:', eventError);
            throw new Error('Event does not exist');
        }

        // 2. Auto-populate registration answers from user profile if empty (like Luma)
        let finalAnswers = { ...registrationAnswers };
        if (Object.keys(finalAnswers).length === 0) {
            // Fetch user profile to get name and email
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('display_name, email')
                .eq('id', userId)
                .single();

            // Also try to get from auth metadata as fallback
            const { data: authUser } = await supabase.auth.admin.getUserById(userId);

            const userName = userProfile?.display_name || 
                           authUser?.user?.user_metadata?.full_name ||
                           authUser?.user?.user_metadata?.name ||
                           authUser?.user?.email?.split('@')[0] ||
                           'Guest';
            
            const userEmail = userProfile?.email || authUser?.user?.email || '';

            // Auto-populate name and email (standard fields)
            if (userName) finalAnswers['full_name'] = userName;
            if (userEmail) finalAnswers['email'] = userEmail;
        }

        // 3. For paid events, verify payment was completed
        const isPaidEvent = event.price && Number(event.price) > 0;
        if (isPaidEvent) {
            // Check if user has a paid RSVP with payment reference
            const { data: paidRSVP } = await supabase
                .from('rsvps')
                .select('payment_reference, payment_provider, amount_paid')
                .eq('event_id', eventId)
                .eq('user_id', userId)
                .eq('status', 'going')
                .not('payment_reference', 'is', null)
                .single();

            if (!paidRSVP || !paidRSVP.payment_reference) {
                console.error('[registerForEvent] Payment required for paid event');
                return { 
                    success: false, 
                    error: 'Payment required. Please complete payment before registering.' 
                };
            }
        }

        // 4. Check duplicate/existing guest
        const { data: existingGuest } = await supabase
            .from('guests')
            .select('id, status')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .single();

        if (existingGuest) {
            // Already registered
            return { success: true, status: existingGuest.status };
        }

        // 5. Register Guest via Repository (Dual Write: Firestore + Supabase)
        // This ensures the Host Dashboard (reading Firestore) sees the guest immediately
        const initialStatus = event.require_approval ? 'pending_approval' : 'issued';

        await guestRepo.createGuest(
            eventId,
            userId,
            'default',
            initialStatus
        );

        // 6. Update Supabase 'rsvps' table for redundancy/compatibility (Dual Persist)
        // rsvp.service.ts reads 'rsvps'.
        // For paid events, RSVP should already exist from payment verification
        // Only create/update if it doesn't exist (for free events)
        const rsvpStatus = event.require_approval ? 'interested' : 'going'; // Map to RSVP status
        
        // Check if RSVP already exists (from payment verification for paid events)
        const { data: existingRSVP } = await supabase
            .from('rsvps')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .single();
        
        if (!existingRSVP) {
            // Only create RSVP if it doesn't exist (free events or first-time registration)
            await supabase
                .from('rsvps')
                .insert({
                    user_id: userId,
                    event_id: eventId,
                    status: rsvpStatus,
                    answers: finalAnswers, // Save answers (auto-populated if empty)
                    ticket_type: isPaidEvent ? 'paid' : 'free'
                });
        } else {
            // Update existing RSVP with answers (always update to ensure name/email are saved)
            await supabase
                .from('rsvps')
                .update({ answers: finalAnswers })
                .eq('user_id', userId)
                .eq('event_id', eventId);
        }

        // 7. Update Attendee Count
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
