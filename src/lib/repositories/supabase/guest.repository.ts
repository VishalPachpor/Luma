/**
 * Supabase Guest Repository
 * Handles guest/attendee operations using Supabase
 */

import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Guest, GuestStatus } from '@/types/commerce';

const supabase = createSupabaseBrowserClient();

/**
 * Transform database row to Guest type
 */
function rowToGuest(row: any): Guest {
    return {
        id: row.id,
        orderId: row.order_id || 'manual',
        eventId: row.event_id,
        ticketTierId: row.ticket_tier_id || 'default',
        userId: row.user_id,
        qrToken: row.qr_token,
        status: row.status as GuestStatus,
        checkedInAt: row.checked_in_at,
        createdAt: row.created_at,
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
    orderId: string = 'manual',
    registrationResponses?: Record<string, unknown>
): Promise<Guest> {
    const { data, error } = await supabase
        .from('guests')
        .insert({
            event_id: eventId,
            user_id: userId,
            ticket_tier_id: ticketTierId,
            status: initialStatus,
            order_id: orderId !== 'manual' ? orderId : null,
            registration_responses: registrationResponses || {},
        })
        .select()
        .single();

    if (error) {
        console.error('[GuestRepo] Create failed:', error);
        throw new Error(error.message);
    }

    return rowToGuest(data);
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
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('[GuestRepo] Find guest failed:', error);
        return null;
    }

    return data ? rowToGuest(data) : null;
}

/**
 * Get all guests for an event
 */
export async function getGuests(eventId: string): Promise<Guest[]> {
    const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[GuestRepo] Get guests failed:', error);
        return [];
    }

    return (data || []).map(rowToGuest);
}

/**
 * Find all guests by User ID (across all events)
 */
export async function findGuestsByUser(userId: string): Promise<Guest[]> {
    const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[GuestRepo] Find guests by user failed:', error);
        return [];
    }

    return (data || []).map(rowToGuest);
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
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[GuestRepo] Find by QR token failed:', error);
        return null;
    }

    return data ? rowToGuest(data) : null;
}

/**
 * Update guest status
 */
export async function updateStatus(
    guestId: string,
    status: GuestStatus,
    additionalData?: {
        approvedBy?: string;
        rejectionReason?: string;
        checkedInBy?: string;
    }
): Promise<Guest | null> {
    const updates: Record<string, unknown> = { status };

    if (status === 'issued' || status === 'approved') {
        updates.approved_at = new Date().toISOString();
        if (additionalData?.approvedBy) {
            updates.approved_by = additionalData.approvedBy;
        }
    }

    if (status === 'rejected' && additionalData?.rejectionReason) {
        updates.rejection_reason = additionalData.rejectionReason;
    }

    if (status === 'scanned') {
        updates.checked_in_at = new Date().toISOString();
        if (additionalData?.checkedInBy) {
            updates.checked_in_by = additionalData.checkedInBy;
        }
    }

    const { data, error } = await supabase
        .from('guests')
        .update(updates)
        .eq('id', guestId)
        .select()
        .single();

    if (error) {
        console.error('[GuestRepo] Update status failed:', error);
        return null;
    }

    return data ? rowToGuest(data) : null;
}

/**
 * Check in a guest (mark as scanned)
 */
export async function checkIn(
    eventId: string,
    guestId: string,
    checkedInBy?: string
): Promise<{ success: boolean; alreadyScanned: boolean; error?: string }> {
    // First, get current status
    const { data: guest, error: fetchError } = await supabase
        .from('guests')
        .select('status')
        .eq('id', guestId)
        .eq('event_id', eventId)
        .single();

    if (fetchError || !guest) {
        return { success: false, alreadyScanned: false, error: 'Guest not found' };
    }

    // Idempotency check
    if (guest.status === 'scanned') {
        return { success: true, alreadyScanned: true };
    }

    // Only 'issued' or 'approved' can be checked in
    if (!['issued', 'approved'].includes(guest.status)) {
        return { success: false, alreadyScanned: false, error: `Invalid status: ${guest.status}` };
    }

    // Update
    const result = await updateStatus(guestId, 'scanned', { checkedInBy });

    return {
        success: !!result,
        alreadyScanned: false,
    };
}

/**
 * Approve a guest
 */
export async function approveGuest(
    guestId: string,
    approvedBy: string
): Promise<Guest | null> {
    return updateStatus(guestId, 'issued', { approvedBy });
}

/**
 * Reject a guest
 */
export async function rejectGuest(
    guestId: string,
    approvedBy: string,
    reason?: string
): Promise<Guest | null> {
    return updateStatus(guestId, 'rejected', {
        approvedBy,
        rejectionReason: reason
    });
}

// Export as object for backwards compatibility
export const guestRepository = {
    createGuest,
    findGuestByUser,
    getGuests,
    findGuestsByUser,
    findByQrToken,
    updateStatus,
    checkIn,
    approveGuest,
    rejectGuest,
};
