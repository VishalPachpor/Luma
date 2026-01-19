/**
 * Supabase Event Actions
 * Server Actions for event mutations using Supabase
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';
import type { Event, CreateEventInput } from '@/types';

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
        const supabase = createSupabaseAdminClient();
        const initialStatus = requireApproval ? 'pending_approval' : 'issued';

        // Check for existing registration
        const { data: existing } = await supabase
            .from('guests')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .single();

        if (existing) {
            return { success: false, error: 'Already registered' };
        }

        // Create guest record
        const { error } = await supabase
            .from('guests')
            .insert({
                event_id: eventId,
                user_id: userId,
                status: initialStatus,
                registration_responses: (registrationResponses || {}) as unknown as Record<string, unknown>,
            });

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

    const { data, error } = await supabase
        .from('events')
        .insert({
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
            registration_questions: input.registrationQuestions as unknown as Record<string, unknown>,
            social_links: input.socialLinks as unknown as Record<string, unknown>,
            agenda: input.agenda as unknown as Record<string, unknown>[],
            hosts: input.hosts as unknown as Record<string, unknown>[],
            who_should_attend: input.whoShouldAttend,
            event_format: input.eventFormat as unknown as Record<string, unknown>[],
            presented_by: input.presentedBy,
            about: input.about,
        })
        .select()
        .single();

    if (error) {
        console.error('[CreateEventAction] Error:', error);
        throw new Error(error.message);
    }

    revalidatePath('/');
    revalidatePath('/api/events');

    // Transform to Event type
    return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        date: data.date,
        location: data.location || '',
        city: data.city || '',
        coords: { lat: data.latitude || 0, lng: data.longitude || 0 },
        coverImage: data.cover_image || '',
        attendees: 0,
        tags: data.tags || [],
        organizer: data.organizer_name || '',
        organizerId: data.organizer_id,
        status: data.status as any,
        visibility: data.visibility as any,
        requireApproval: data.require_approval,
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
        const supabase = createSupabaseAdminClient();

        // Get guest and event info for notification
        const { data: guest, error: guestError } = await supabase
            .from('guests')
            .select('user_id, status')
            .eq('id', guestId)
            .single();

        if (guestError || !guest) {
            return { success: false, error: 'Guest not found' };
        }

        if (guest.status !== 'pending_approval') {
            return { success: false, error: `Cannot approve guest with status: ${guest.status}` };
        }

        // Update guest status
        const { error: updateError } = await supabase
            .from('guests')
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
        const { data: event } = await supabase
            .from('events')
            .select('title')
            .eq('id', eventId)
            .single();

        // Send notification
        await supabase.from('notifications').insert({
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
        const supabase = createSupabaseAdminClient();

        const { data: guest, error: guestError } = await supabase
            .from('guests')
            .select('user_id, status')
            .eq('id', guestId)
            .single();

        if (guestError || !guest) {
            return { success: false, error: 'Guest not found' };
        }

        if (guest.status !== 'pending_approval') {
            return { success: false, error: `Cannot reject guest with status: ${guest.status}` };
        }

        const { error: updateError } = await supabase
            .from('guests')
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

        const { data: event } = await supabase
            .from('events')
            .select('title')
            .eq('id', eventId)
            .single();

        await supabase.from('notifications').insert({
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
