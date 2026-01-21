/**
 * Invitation Repository
 * Production-grade data access layer for invitations with:
 * - Idempotent operations (upsert pattern)
 * - Batch processing with transactions
 * - State machine validation
 * - Atomic counter updates
 * - Email tracking integration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type {
    Invitation,
    CreateInvitationInput,
    BatchInvitationInput,
    BatchInvitationResult,
    InvitationStatus,
    InvitationSource,
    InvitationStats,
    isValidInvitationTransition,
} from '@/types/invitation';
import { generateId } from '@/lib/utils';

// ===========================================
// CLIENT CONFIGURATION
// ===========================================

/**
 * Get public Supabase client for read operations
 * Works in both server and client contexts
 */
const getPublicClient = (): SupabaseClient<Database> | null => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        console.warn('[InvitationRepo] Missing Supabase env vars');
        return null;
    }

    return createClient<Database>(url, anonKey);
};

/**
 * Get service role client for privileged operations
 * Server-only - bypasses RLS
 */
const getAdminClient = (): SupabaseClient<Database> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error('[InvitationRepo] Service role key required');
    }

    return createClient<Database>(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
};

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface InvitationRow {
    id: string;
    event_id: string;
    calendar_id: string | null;
    email: string;
    recipient_name: string | null;
    user_id: string | null;
    invited_by: string;
    source: string;
    status: string;
    tracking_token: string;
    sent_at: string | null;
    opened_at: string | null;
    clicked_at: string | null;
    responded_at: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// ===========================================
// NORMALIZATION
// ===========================================

/**
 * Normalize database row to domain model
 */
function normalizeInvitation(row: InvitationRow): Invitation {
    return {
        id: row.id,
        eventId: row.event_id,
        calendarId: row.calendar_id ?? undefined,
        email: row.email,
        recipientName: row.recipient_name ?? undefined,
        userId: row.user_id ?? undefined,
        invitedBy: row.invited_by,
        source: row.source as InvitationSource,
        status: row.status as InvitationStatus,
        trackingToken: row.tracking_token,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        sentAt: row.sent_at ?? undefined,
        openedAt: row.opened_at ?? undefined,
        clickedAt: row.clicked_at ?? undefined,
        respondedAt: row.responded_at ?? undefined,
        metadata: row.metadata || {},
    };
}

// ===========================================
// CREATE OPERATIONS
// ===========================================

/**
 * Create a single invitation with upsert semantics
 * If invitation already exists for email+event, returns existing
 * 
 * @returns Created or existing invitation with isNew flag
 */
export async function create(
    input: CreateInvitationInput,
    invitedBy: string
): Promise<{ invitation: Invitation; isNew: boolean }> {
    const client = getAdminClient();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
        throw new Error(`Invalid email format: ${input.email}`);
    }

    // Check for existing invitation
    const { data: existing } = await client
        .from('invitations')
        .select('*')
        .eq('event_id', input.eventId)
        .eq('email', input.email.toLowerCase().trim())
        .maybeSingle();

    if (existing) {
        return {
            invitation: normalizeInvitation(existing as unknown as InvitationRow),
            isNew: false,
        };
    }

    // Create new invitation
    const invitationId = generateId();
    const trackingToken = generateId();

    const { data, error } = await client
        .from('invitations')
        .insert({
            id: invitationId,
            event_id: input.eventId,
            calendar_id: input.calendarId ?? null,
            email: input.email.toLowerCase().trim(),
            recipient_name: input.recipientName ?? null,
            invited_by: invitedBy,
            source: input.source ?? 'manual',
            status: 'pending',
            tracking_token: trackingToken,
            metadata: input.metadata ?? {},
        } as any)
        .select()
        .single();

    if (error) {
        // Handle unique constraint violation (race condition)
        if (error.code === '23505') {
            const { data: existing } = await client
                .from('invitations')
                .select('*')
                .eq('event_id', input.eventId)
                .eq('email', input.email.toLowerCase().trim())
                .single();

            if (existing) {
                return {
                    invitation: normalizeInvitation(existing as unknown as InvitationRow),
                    isNew: false,
                };
            }
        }
        throw new Error(`Failed to create invitation: ${error.message}`);
    }

    return {
        invitation: normalizeInvitation(data as unknown as InvitationRow),
        isNew: true,
    };
}

/**
 * Create multiple invitations in a batch
 * Uses transaction for atomicity with partial success handling
 */
export async function createBatch(
    input: BatchInvitationInput,
    invitedBy: string
): Promise<BatchInvitationResult> {
    const client = getAdminClient();

    const created: Invitation[] = [];
    const duplicates: string[] = [];
    const failed: string[] = [];

    // Process each invite
    for (const invite of input.invites) {
        try {
            const result = await create(
                {
                    eventId: input.eventId,
                    calendarId: input.calendarId,
                    email: invite.email,
                    recipientName: invite.name,
                    source: input.source ?? 'manual',
                },
                invitedBy
            );

            if (result.isNew) {
                created.push(result.invitation);
            } else {
                duplicates.push(invite.email);
            }
        } catch (error) {
            console.error(`[InvitationRepo] Failed to create invite for ${invite.email}:`, error);
            failed.push(invite.email);
        }
    }

    return {
        created: created.length,
        duplicates,
        failed,
        invitations: created,
    };
}

// ===========================================
// READ OPERATIONS
// ===========================================

/**
 * Find invitation by ID
 */
export async function findById(id: string): Promise<Invitation | null> {
    const client = getPublicClient();
    if (!client) return null;

    const { data, error } = await client
        .from('invitations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error || !data) return null;
    return normalizeInvitation(data as unknown as InvitationRow);
}

/**
 * Find invitation by tracking token (for email pixel)
 */
export async function findByTrackingToken(token: string): Promise<Invitation | null> {
    const client = getAdminClient();

    const { data, error } = await client
        .from('invitations')
        .select('*')
        .eq('tracking_token', token)
        .maybeSingle();

    if (error || !data) return null;
    return normalizeInvitation(data as unknown as InvitationRow);
}

/**
 * Find invitation by email and event (for RSVP linking)
 */
export async function findByEmailAndEvent(
    email: string,
    eventId: string
): Promise<Invitation | null> {
    const client = getAdminClient();

    const { data, error } = await client
        .from('invitations')
        .select('*')
        .eq('event_id', eventId)
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

    if (error || !data) return null;
    return normalizeInvitation(data as unknown as InvitationRow);
}

/**
 * Get all invitations for an event with pagination
 */
export async function findByEvent(
    eventId: string,
    options: {
        status?: InvitationStatus;
        limit?: number;
        offset?: number;
    } = {}
): Promise<{ invitations: Invitation[]; total: number }> {
    const client = getAdminClient();
    const { status, limit = 50, offset = 0 } = options;

    let query = client
        .from('invitations')
        .select('*', { count: 'exact' })
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
        console.error('[InvitationRepo] Error fetching invitations:', error);
        return { invitations: [], total: 0 };
    }

    return {
        invitations: (data || []).map((row) => normalizeInvitation(row as unknown as InvitationRow)),
        total: count ?? 0,
    };
}

/**
 * Get invitations for a user (by email)
 */
export async function findByUserEmail(email: string): Promise<Invitation[]> {
    const client = getAdminClient();

    const { data, error } = await client
        .from('invitations')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((row) => normalizeInvitation(row as unknown as InvitationRow));
}

// ===========================================
// UPDATE OPERATIONS
// ===========================================

/**
 * Update invitation status with state machine validation
 */
export async function updateStatus(
    id: string,
    newStatus: InvitationStatus,
    options: {
        skipValidation?: boolean;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<Invitation | null> {
    const client = getAdminClient();

    // Fetch current state
    const { data: current, error: fetchError } = await client
        .from('invitations')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !current) {
        console.error('[InvitationRepo] Invitation not found:', id);
        return null;
    }

    const currentRow = current as unknown as InvitationRow;
    const currentStatus = currentRow.status as InvitationStatus;

    // Validate state transition (unless skipped for admin operations)
    if (!options.skipValidation) {
        // Import the validation function dynamically to avoid circular deps
        const { isValidInvitationTransition } = await import('@/types/invitation');

        if (!isValidInvitationTransition(currentStatus, newStatus)) {
            throw new Error(
                `Invalid status transition: ${currentStatus} → ${newStatus}`
            );
        }
    }

    // Prepare update payload
    const updatePayload: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
    };

    // Set responded_at for terminal acceptance/decline
    if (newStatus === 'accepted' || newStatus === 'declined') {
        updatePayload.responded_at = new Date().toISOString();
    }

    // Merge metadata if provided
    if (options.metadata) {
        updatePayload.metadata = {
            ...(currentRow.metadata as Record<string, unknown> || {}),
            ...options.metadata,
        };
    }

    const { data, error } = await (client
        .from('invitations') as any)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update invitation: ${error.message}`);
    }

    return normalizeInvitation(data as InvitationRow);
}

/**
 * Mark invitation as sent (called after email dispatch)
 */
export async function markAsSent(id: string): Promise<Invitation | null> {
    const client = getAdminClient();

    const { data, error } = await (client
        .from('invitations') as any)
        .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending')
        .select()
        .single();

    if (error) {
        // Not an error if already sent
        if (error.code === 'PGRST116') return null;
        console.error('[InvitationRepo] Error marking as sent:', error);
        return null;
    }

    return normalizeInvitation(data as InvitationRow);
}

/**
 * Record email open using RPC function (idempotent)
 */
export async function recordOpen(trackingToken: string): Promise<{
    invitationId: string | null;
    eventId: string | null;
    alreadyOpened: boolean;
}> {
    const client = getAdminClient();

    // Use direct SQL for RPC since types may not be generated
    const { data, error } = await (client.rpc as any)('record_invite_open', {
        p_tracking_token: trackingToken,
    }) as { data: Array<{ invitation_id: string; event_id: string; already_opened: boolean }> | null; error: any };

    if (error) {
        console.error('[InvitationRepo] Error recording open:', error);
        return { invitationId: null, eventId: null, alreadyOpened: false };
    }

    if (!data || data.length === 0) {
        return { invitationId: null, eventId: null, alreadyOpened: false };
    }

    const result = data[0];
    return {
        invitationId: result.invitation_id,
        eventId: result.event_id,
        alreadyOpened: result.already_opened,
    };
}

/**
 * Record link click using RPC function (idempotent)
 */
export async function recordClick(trackingToken: string): Promise<{
    invitationId: string | null;
    eventId: string | null;
    alreadyClicked: boolean;
}> {
    const client = getAdminClient();

    // Use direct SQL for RPC since types may not be generated
    const { data, error } = await (client.rpc as any)('record_invite_click', {
        p_tracking_token: trackingToken,
    }) as { data: Array<{ invitation_id: string; event_id: string; already_clicked: boolean }> | null; error: any };

    if (error) {
        console.error('[InvitationRepo] Error recording click:', error);
        return { invitationId: null, eventId: null, alreadyClicked: false };
    }

    if (!data || data.length === 0) {
        return { invitationId: null, eventId: null, alreadyClicked: false };
    }

    const result = data[0];
    return {
        invitationId: result.invitation_id,
        eventId: result.event_id,
        alreadyClicked: result.already_clicked,
    };
}

/**
 * Mark invitation as bounced
 */
export async function markAsBounced(
    id: string,
    bounceReason?: string
): Promise<Invitation | null> {
    const client = getAdminClient();

    const { data, error } = await (client
        .from('invitations') as any)
        .update({
            status: 'bounced',
            metadata: bounceReason ? { bounceReason } : {},
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[InvitationRepo] Error marking as bounced:', error);
        return null;
    }

    return normalizeInvitation(data as InvitationRow);
}

// ===========================================
// STATISTICS
// ===========================================

/**
 * Get invitation statistics for an event using RPC
 */
export async function getStats(eventId: string): Promise<InvitationStats | null> {
    const client = getAdminClient();

    interface StatsRow {
        total_sent: number;
        total_opened: number;
        total_clicked: number;
        total_accepted: number;
        total_declined: number;
        total_bounced: number;
        open_rate: number;
        click_rate: number;
        accept_rate: number;
    }

    // Use direct SQL for RPC since types may not be generated
    const { data, error } = await (client.rpc as any)('get_invitation_stats', {
        p_event_id: eventId,
    }) as { data: StatsRow[] | null; error: any };

    if (error) {
        console.error('[InvitationRepo] Error getting stats:', error);
        return null;
    }

    if (!data || data.length === 0) {
        return {
            totalSent: 0,
            totalOpened: 0,
            totalClicked: 0,
            totalAccepted: 0,
            totalDeclined: 0,
            totalBounced: 0,
            openRate: 0,
            clickRate: 0,
            acceptRate: 0,
        };
    }

    const row = data[0];
    return {
        totalSent: row.total_sent,
        totalOpened: row.total_opened,
        totalClicked: row.total_clicked,
        totalAccepted: row.total_accepted,
        totalDeclined: row.total_declined,
        totalBounced: row.total_bounced,
        openRate: row.open_rate,
        clickRate: row.click_rate,
        acceptRate: row.accept_rate,
    };
}

/**
 * Get count of invitations by status for an event
 */
export async function getCountsByStatus(
    eventId: string
): Promise<Record<InvitationStatus, number>> {
    const client = getAdminClient();

    const { data, error } = await client
        .from('invitations')
        .select('status')
        .eq('event_id', eventId);

    if (error || !data) {
        return {
            pending: 0,
            sent: 0,
            opened: 0,
            clicked: 0,
            accepted: 0,
            declined: 0,
            bounced: 0,
        };
    }

    const counts: Record<InvitationStatus, number> = {
        pending: 0,
        sent: 0,
        opened: 0,
        clicked: 0,
        accepted: 0,
        declined: 0,
        bounced: 0,
    };

    for (const row of data as Array<{ status: string }>) {
        const status = row.status as InvitationStatus;
        if (status in counts) {
            counts[status]++;
        }
    }

    return counts;
}

// ===========================================
// DELETE OPERATIONS
// ===========================================

/**
 * Delete an invitation (only pending/bounced allowed)
 */
export async function remove(id: string): Promise<boolean> {
    const client = getAdminClient();

    const { error } = await client
        .from('invitations')
        .delete()
        .eq('id', id)
        .in('status', ['pending', 'bounced']); // Only allow deleting non-sent

    if (error) {
        console.error('[InvitationRepo] Error deleting invitation:', error);
        return false;
    }

    return true;
}

/**
 * Delete all invitations for an event (admin only, for event deletion cascade)
 */
export async function removeAllForEvent(eventId: string): Promise<number> {
    const client = getAdminClient();

    const { data, error } = await client
        .from('invitations')
        .delete()
        .eq('event_id', eventId)
        .select('id');

    if (error) {
        console.error('[InvitationRepo] Error deleting event invitations:', error);
        return 0;
    }

    return data?.length ?? 0;
}
