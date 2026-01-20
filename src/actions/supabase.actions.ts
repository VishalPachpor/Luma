/**
 * Supabase Event Actions
 * Server Actions for event mutations using Supabase
 */

'use server';

import { revalidatePath } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase';
import type { Event, CreateEventInput } from '@/types';
import type { Database } from '@/types/database.types';

type EventRow = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type GuestInsert = Database['public']['Tables']['guests']['Insert'];

/**
 * Register for an event
 * Creates guest record in Supabase
 */
export async function registerForEvent(
    eventId: string,
    userId: string,
    requireApproval: boolean = false,
    registrationResponses?: Record<string, unknown>
): Promise<{ success: boolean; error?: string; status?: string }> {
    try {
        const supabase = getServiceSupabase();
        const initialStatus = requireApproval ? 'pending_approval' : 'issued';

        // Check for existing registration
        // We can leave select() as is if it works, or cast it too if needed
        const { data: existing } = await supabase
            .from('guests')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .single();

        if (existing) {
            return { success: false, error: 'Already registered' };
        }

        const payload: GuestInsert = {
            event_id: eventId,
            user_id: userId,
            status: initialStatus,
            registration_responses: (registrationResponses || {}) as any,
        };

        // Create guest record
        // Bypass inference on .from()
        const { error } = await (supabase.from('guests') as any).insert(payload);

        if (error) {
            console.error('[RegisterAction] Insert failed:', error);
            return { success: false, error: error.message };
        }

        revalidatePath(`/events/${eventId}`);
        return { success: true, status: initialStatus };
    } catch (error: any) {
        console.error('[RegisterAction] Error:', error);
        return { success: false, error: error.message || 'Registration failed' };
    }
}

/**
 * Create a new event
 */
export async function createEvent(input: CreateEventInput, organizerId: string): Promise<Event> {
    const supabase = await createSupabaseServerClient();

    const payload: EventInsert = {
        title: input.title,
        description: input.description,
        date: input.date,
        location: input.location,
        city: input.city,
        latitude: input.coords?.lat,
        longitude: input.coords?.lng,
        cover_image: input.coverImage,
        tags: input.tags,
        organizer_id: organizerId,
        organizer_name: input.organizer,
        capacity: input.capacity,
        price: input.price,
        status: input.status || 'published',
        visibility: input.visibility || 'public',
        require_approval: input.requireApproval,
        registration_questions: input.registrationQuestions as any,
        social_links: input.socialLinks as any,
        agenda: input.agenda as any,
        hosts: input.hosts as any,
        who_should_attend: input.whoShouldAttend,
        event_format: input.eventFormat as any,
        presented_by: input.presentedBy,
        about: input.about,
    };

    const { data, error } = await (supabase.from('events') as any)
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error('[CreateEventAction] Error:', error);
        throw new Error(error.message);
    }

    // Type assertion for data since we used 'as any' on insert
    const eventData = data as unknown as EventRow;

    revalidatePath('/');
    revalidatePath('/api/events');

    // Transform to Event type
    return {
        id: eventData.id,
        title: eventData.title,
        description: eventData.description || '',
        date: eventData.date,
        location: eventData.location || '',
        city: eventData.city || '',
        coords: { lat: eventData.latitude || 0, lng: eventData.longitude || 0 },
        coverImage: eventData.cover_image || '',
        attendees: 0,
        tags: eventData.tags || [],
        organizer: eventData.organizer_name || '',
        organizerId: eventData.organizer_id,
        status: eventData.status as any,
        visibility: eventData.visibility as any,
        requireApproval: eventData.require_approval,
    };
}

/**
 * Delete an event
 */
export async function deleteEvent(id: string): Promise<boolean> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[DeleteEventAction] Error:', error);
        return false;
    }

    revalidatePath('/');
    revalidatePath('/api/events');
    return true;
}

/**
 * Approve a guest
 */
export async function approveGuest(
    eventId: string,
    guestId: string,
    hostId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = getServiceSupabase();

        // Get guest and event info for notification
        const { data: guestData, error: guestError } = await supabase
            .from('guests')
            .select('user_id, status')
            .eq('id', guestId)
            .single();

        const guest = guestData as { user_id: string; status: string } | null;

        if (guestError || !guest) {
            return { success: false, error: 'Guest not found' };
        }

        if (guest.status !== 'pending_approval') {
            return { success: false, error: `Cannot approve guest with status: ${guest.status}` };
        }

        // Update guest status
        const { error: updateError } = await (supabase.from('guests') as any)
            .update({
                status: 'issued',
                approved_by: hostId,
                approved_at: new Date().toISOString(),
            })
            .eq('id', guestId);

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        // Get event title for notification
        const { data: eventData } = await supabase
            .from('events')
            .select('title')
            .eq('id', eventId)
            .single();

        const event = eventData as { title: string } | null;

        // Send notification
        await (supabase.from('notifications') as any).insert({
            user_id: guest.user_id,
            type: 'approval_granted',
            title: `You're approved for ${event?.title || 'the event'}!`,
            message: 'Your registration has been approved. See you there!',
            link: `/events/${eventId}`,
            metadata: { eventId, approved: true },
        });

        revalidatePath(`/events/${eventId}/manage`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Reject a guest
 */
export async function rejectGuest(
    eventId: string,
    guestId: string,
    hostId: string,
    reason?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = getServiceSupabase();

        const { data: guestData, error: guestError } = await supabase
            .from('guests')
            .select('user_id, status')
            .eq('id', guestId)
            .single();

        const guest = guestData as { user_id: string; status: string } | null;

        if (guestError || !guest) {
            return { success: false, error: 'Guest not found' };
        }

        if (guest.status !== 'pending_approval') {
            return { success: false, error: `Cannot reject guest with status: ${guest.status}` };
        }

        const { error: updateError } = await (supabase.from('guests') as any)
            .update({
                status: 'rejected',
                approved_by: hostId,
                approved_at: new Date().toISOString(),
                rejection_reason: reason,
            })
            .eq('id', guestId);

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        const { data: eventData } = await supabase
            .from('events')
            .select('title')
            .eq('id', eventId)
            .single();

        const event = eventData as { title: string } | null;

        await (supabase.from('notifications') as any).insert({
            user_id: guest.user_id,
            type: 'approval_rejected',
            title: `Registration update for ${event?.title || 'the event'}`,
            message: reason || 'Unfortunately, your registration was not approved.',
            link: `/events/${eventId}`,
            metadata: { eventId, approved: false },
        });

        revalidatePath(`/events/${eventId}/manage`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
