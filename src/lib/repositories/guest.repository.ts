import { supabase } from '@/lib/supabase';
import { Guest, GuestStatus } from '@/types/commerce';
import { generateId } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

/**
 * Guest Repository
 * Handles guest/attendee entities in Supabase
 */

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

/**
 * Create a new guest (Register for event)
 */
export async function createGuest(
    eventId: string,
    userId: string,
    ticketTierId: string = 'default',
    initialStatus: GuestStatus = 'issued',
    orderId: string = 'manual'
): Promise<Guest> {
    const guestId = generateId();
    const qrToken = generateId();

    const supabaseBrowser = createSupabaseBrowserClient();

    const payload: any = {
        id: guestId,
        event_id: eventId,
        user_id: userId,
        status: initialStatus,
        ticket_tier_id: ticketTierId === 'default' ? null : ticketTierId,
        order_id: orderId === 'manual' ? null : orderId,
        qr_token: qrToken,
    };

    const { data, error } = await supabaseBrowser
        .from('guests')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error('[GuestRepo] Supabase insert failed:', error);
        throw new Error(error.message);
    }

    return normalizeSupabaseGuest(data);
}

/**
 * Find guest by User ID and Event ID
 */
export async function findGuestByUser(eventId: string, userId: string): Promise<Guest | null> {
    const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        // console.error('[GuestRepo] Supabase find failed:', error);
        return null;
    }

    return data ? normalizeSupabaseGuest(data) : null;
}

/**
 * Get all guests for an event
 */
export async function getGuests(eventId: string): Promise<Guest[]> {
    const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId);

    if (error) {
        console.error('[GuestRepo] Supabase getGuests failed:', error);
        return [];
    }

    return (data || []).map(normalizeSupabaseGuest);
}

/**
 * Find all guests by User ID (across all events)
 */
export async function findGuestsByUser(userId: string): Promise<Guest[]> {
    const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('[GuestRepo] Supabase findGuestsByUser failed:', error);
        return [];
    }

    return (data || []).map(normalizeSupabaseGuest);
}

/**
 * Find guest by QR Token (for check-in)
 */
export async function findByQrToken(eventId: string, qrToken: string): Promise<Guest | null> {
    const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .eq('qr_token', qrToken)
        .maybeSingle();

    if (error || !data) return null;
    return normalizeSupabaseGuest(data);
}

/**
 * Check in a guest (mark as scanned)
 */
export async function checkIn(eventId: string, guestId: string): Promise<{ success: boolean; alreadyScanned: boolean; error?: string }> {
    const supabaseBrowser = createSupabaseBrowserClient();

    // Fetch first to validate status
    const { data: guest, error: fetchError } = await supabaseBrowser
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

    if (guest.status !== 'issued' && guest.status !== 'approved') {
        return { success: false, alreadyScanned: false, error: `Invalid ticket status: ${guest.status}` };
    }

    const { error: updateError } = await supabaseBrowser
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
