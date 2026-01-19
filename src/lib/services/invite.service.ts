/**
 * Invite Service
 * Manages event invitations via Supabase 'invitations' table
 */

import { supabase } from '@/lib/supabase';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export interface EventInvite {
    id: string;
    eventId: string;
    email: string;
    sentBy: string;
    sentByName: string; // Not stored in DB but joined via invited_by
    status: 'pending' | 'accepted' | 'declined';
    sentAt: Date;
}

/**
 * Send invite email via API and record in Supabase
 */
export async function sendInviteEmail(
    eventId: string,
    eventTitle: string,
    recipientEmail: string,
    senderInfo: { uid: string; name: string; email: string }
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabaseBrowser = createSupabaseBrowserClient();

        // 1. Insert into invitations table
        const { error: dbError } = await supabaseBrowser
            .from('invitations' as any)
            .insert({
                event_id: eventId,
                email: recipientEmail,
                invited_by: senderInfo.uid,
                status: 'pending'
            });

        if (dbError) {
            // If already invited, maybe ignore?
            if (dbError.code === '23505') { // Unique violation
                return { success: false, error: 'User already invited' };
            }
            throw dbError;
        }

        // 2. Call API to send actual email (Resend)
        // We keep the API route for sending email as it needs secret keys
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
            // Rollback DB insert? Or just leave as pending but failed to send?
            // For now, return error.
            return { success: false, error: data.error };
        }

        // Update status to 'sent' if email success
        await supabaseBrowser
            .from('invitations' as any)
            .update({ status: 'sent' })
            .eq('event_id', eventId)
            .eq('email', recipientEmail);

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
    const { data, error } = await supabase
        .from('invitations' as any)
        .select('*, invited_by_profile:invited_by(display_name)')
        .eq('event_id', eventId);

    if (error || !data) return [];

    return data.map((row: any) => ({
        id: row.id,
        eventId: row.event_id,
        email: row.email,
        sentBy: row.invited_by,
        sentByName: row.invited_by_profile?.display_name || 'Unknown',
        status: row.status as any,
        sentAt: new Date(row.created_at),
    }));
}

/**
 * Update invite status (when user accepts/declines)
 */
export async function updateInviteStatus(
    eventId: string,
    inviteId: string,
    status: 'accepted' | 'declined'
): Promise<void> {
    const supabaseBrowser = createSupabaseBrowserClient();
    await supabaseBrowser
        .from('invitations' as any)
        .update({ status })
        .eq('id', inviteId);
}
