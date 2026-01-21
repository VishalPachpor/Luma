/**
 * Invite Service
 * Production-grade orchestration layer for invitation lifecycle
 * 
 * Responsibilities:
 * - Orchestrates repository + Inngest + counter updates
 * - Validates business rules (limits, event state, duplicates)
 * - Links invites to RSVPs for full funnel tracking
 * - Emits analytics events
 */

import * as invitationRepo from '@/lib/repositories/invitation.repository';
import { inngest } from '@/inngest/client';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type {
    Invitation,
    CreateInvitationInput,
    BatchInvitationInput,
    BatchInvitationResult,
    InvitationStats,
    EventCounters,
} from '@/types/invitation';

// ===========================================
// SERVICE CONFIGURATION
// ===========================================

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error('[InviteService] Service role key required');
    }

    return createClient<Database>(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
};

// ===========================================
// VALIDATION
// ===========================================

interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate event state allows invitations
 */
async function validateEventState(eventId: string): Promise<ValidationResult> {
    const client = getAdminClient();

    interface EventRow {
        id: string;
        status: string;
        visibility: string;
        settings: Record<string, unknown>;
    }

    const { data: event, error } = await (client
        .from('events') as any)
        .select('id, status, visibility, settings')
        .eq('id', eventId)
        .single() as { data: EventRow | null; error: any };

    if (error || !event) {
        return { valid: false, error: 'Event not found' };
    }

    // Check event is published
    if (event.status !== 'published') {
        return { valid: false, error: 'Event is not published' };
    }

    return { valid: true };
}

/**
 * Check invite limit for event
 */
async function checkInviteLimit(
    eventId: string,
    requestedCount: number
): Promise<ValidationResult> {
    const client = getAdminClient();

    interface EventRow {
        settings: Record<string, unknown>;
        counters: Record<string, unknown>;
    }

    // Get event settings and current counters
    const { data: event, error } = await (client
        .from('events') as any)
        .select('settings, counters')
        .eq('id', eventId)
        .single() as { data: EventRow | null; error: any };

    if (error || !event) {
        return { valid: false, error: 'Event not found' };
    }

    const settings = (event.settings as { max_invites_per_user?: number }) || {};
    const counters = (event.counters as unknown as EventCounters) || { invites_sent: 0 };

    const maxInvites = settings.max_invites_per_user ?? 500; // Default high limit
    const currentSent = counters.invites_sent ?? 0;

    if (currentSent + requestedCount > maxInvites) {
        return {
            valid: false,
            error: `Invite limit exceeded. Max: ${maxInvites}, Current: ${currentSent}, Requested: ${requestedCount}`,
        };
    }

    return { valid: true };
}

/**
 * Validate email format
 */
function validateEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, error: `Invalid email format: ${email}` };
    }
    return { valid: true };
}

// ===========================================
// CORE OPERATIONS
// ===========================================

export interface SendInviteInput {
    eventId: string;
    eventTitle: string;
    recipientEmail: string;
    recipientName?: string;
    senderInfo: {
        uid: string;
        name: string;
        email: string;
    };
    source?: 'manual' | 'calendar' | 'import' | 'csv' | 'api';
}

export interface SendInviteResult {
    success: boolean;
    invitation?: Invitation;
    isDuplicate?: boolean;
    jobId?: string;
    error?: string;
}

/**
 * Send a single invitation
 * Orchestrates: validation → DB creation → Inngest job → counter update
 */
export async function sendInvite(input: SendInviteInput): Promise<SendInviteResult> {
    try {
        // 1. Validate email
        const emailValidation = validateEmail(input.recipientEmail);
        if (!emailValidation.valid) {
            return { success: false, error: emailValidation.error };
        }

        // 2. Validate event state
        const eventValidation = await validateEventState(input.eventId);
        if (!eventValidation.valid) {
            return { success: false, error: eventValidation.error };
        }

        // 3. Check invite limit
        const limitValidation = await checkInviteLimit(input.eventId, 1);
        if (!limitValidation.valid) {
            return { success: false, error: limitValidation.error };
        }

        // 4. Create invitation in database (idempotent)
        const { invitation, isNew } = await invitationRepo.create(
            {
                eventId: input.eventId,
                email: input.recipientEmail,
                recipientName: input.recipientName,
                source: input.source ?? 'manual',
            },
            input.senderInfo.uid
        );

        if (!isNew) {
            return {
                success: true,
                invitation,
                isDuplicate: true,
            };
        }

        // 5. Queue email sending via Inngest
        const { ids } = await inngest.send({
            name: 'app/invite.created',
            data: {
                invitationId: invitation.id,
                eventId: input.eventId,
                eventTitle: input.eventTitle,
                recipientEmail: input.recipientEmail,
                recipientName: input.recipientName,
                senderName: input.senderInfo.name,
                senderEmail: input.senderInfo.email,
                trackingToken: invitation.trackingToken,
            },
        });

        // 6. Increment counter atomically
        const client = getAdminClient();
        await (client.rpc as any)('increment_event_counter', {
            p_event_id: input.eventId,
            p_counter_name: 'invites_sent',
            p_increment: 1,
        });

        return {
            success: true,
            invitation,
            isDuplicate: false,
            jobId: ids[0],
        };
    } catch (error) {
        console.error('[InviteService] sendInvite error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send invite',
        };
    }
}

export interface BatchSendInput {
    eventId: string;
    eventTitle: string;
    emails: Array<{ email: string; name?: string }>;
    senderInfo: {
        uid: string;
        name: string;
        email: string;
    };
    source?: 'manual' | 'calendar' | 'import' | 'csv' | 'api';
}

export interface BatchSendResult {
    success: boolean;
    created: number;
    duplicates: string[];
    failed: Array<{ email: string; error: string }>;
    invitations: Invitation[];
    jobIds: string[];
}

/**
 * Send multiple invitations in batch
 * Validates all first, then processes with partial success support
 */
export async function sendBatchInvites(input: BatchSendInput): Promise<BatchSendResult> {
    const result: BatchSendResult = {
        success: true,
        created: 0,
        duplicates: [],
        failed: [],
        invitations: [],
        jobIds: [],
    };

    try {
        // 1. Validate event state once
        const eventValidation = await validateEventState(input.eventId);
        if (!eventValidation.valid) {
            result.success = false;
            result.failed = input.emails.map((e) => ({
                email: e.email,
                error: eventValidation.error!,
            }));
            return result;
        }

        // 2. Check invite limit for batch
        const limitValidation = await checkInviteLimit(input.eventId, input.emails.length);
        if (!limitValidation.valid) {
            result.success = false;
            result.failed = input.emails.map((e) => ({
                email: e.email,
                error: limitValidation.error!,
            }));
            return result;
        }

        // 3. Process each email
        const newInvitations: Invitation[] = [];

        for (const emailInput of input.emails) {
            // Validate email format
            const emailValidation = validateEmail(emailInput.email);
            if (!emailValidation.valid) {
                result.failed.push({
                    email: emailInput.email,
                    error: emailValidation.error!,
                });
                continue;
            }

            try {
                const { invitation, isNew } = await invitationRepo.create(
                    {
                        eventId: input.eventId,
                        email: emailInput.email,
                        recipientName: emailInput.name,
                        source: input.source ?? 'manual',
                    },
                    input.senderInfo.uid
                );

                if (isNew) {
                    newInvitations.push(invitation);
                    result.invitations.push(invitation);
                    result.created++;
                } else {
                    result.duplicates.push(emailInput.email);
                }
            } catch (error) {
                result.failed.push({
                    email: emailInput.email,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        // 4. Queue batch email sending via Inngest
        if (newInvitations.length > 0) {
            const events = newInvitations.map((inv) => ({
                name: 'app/invite.created' as const,
                data: {
                    invitationId: inv.id,
                    eventId: input.eventId,
                    eventTitle: input.eventTitle,
                    recipientEmail: inv.email,
                    recipientName: inv.recipientName,
                    senderName: input.senderInfo.name,
                    senderEmail: input.senderInfo.email,
                    trackingToken: inv.trackingToken,
                },
            }));

            const { ids } = await inngest.send(events);
            result.jobIds = ids;

            // 5. Increment counter atomically for all new invites
            const client = getAdminClient();
            await (client.rpc as any)('increment_event_counter', {
                p_event_id: input.eventId,
                p_counter_name: 'invites_sent',
                p_increment: newInvitations.length,
            });
        }

        result.success = result.failed.length === 0;
        return result;
    } catch (error) {
        console.error('[InviteService] sendBatchInvites error:', error);
        return {
            success: false,
            created: 0,
            duplicates: [],
            failed: input.emails.map((e) => ({
                email: e.email,
                error: error instanceof Error ? error.message : 'Batch processing failed',
            })),
            invitations: [],
            jobIds: [],
        };
    }
}

// ===========================================
// INVITE → RSVP LINKING
// ===========================================

/**
 * Link an invitation to a guest record when RSVP occurs
 * Called from RSVP flow to complete the funnel tracking
 */
export async function linkInviteToRSVP(
    eventId: string,
    email: string,
    guestId: string
): Promise<{ linked: boolean; invitationId?: string }> {
    try {
        // Find invitation by email and event
        const invitation = await invitationRepo.findByEmailAndEvent(email, eventId);

        if (!invitation) {
            return { linked: false };
        }

        // Update guest with invitation_id
        const client = getAdminClient();
        const { error } = await (client
            .from('guests') as any)
            .update({ invitation_id: invitation.id })
            .eq('id', guestId);

        if (error) {
            console.error('[InviteService] Error linking invite to RSVP:', error);
            return { linked: false };
        }

        // Update invitation status to accepted
        await invitationRepo.updateStatus(invitation.id, 'accepted');

        return { linked: true, invitationId: invitation.id };
    } catch (error) {
        console.error('[InviteService] linkInviteToRSVP error:', error);
        return { linked: false };
    }
}

// ===========================================
// EMAIL TRACKING HANDLERS
// ===========================================

/**
 * Handle email open tracking (called from tracking pixel endpoint)
 */
export async function handleInviteOpen(trackingToken: string): Promise<{
    success: boolean;
    alreadyOpened: boolean;
}> {
    try {
        const result = await invitationRepo.recordOpen(trackingToken);

        if (!result.invitationId) {
            return { success: false, alreadyOpened: false };
        }

        return { success: true, alreadyOpened: result.alreadyOpened };
    } catch (error) {
        console.error('[InviteService] handleInviteOpen error:', error);
        return { success: false, alreadyOpened: false };
    }
}

/**
 * Handle email link click tracking
 */
export async function handleInviteClick(trackingToken: string): Promise<{
    success: boolean;
    alreadyClicked: boolean;
    eventId?: string;
}> {
    try {
        const result = await invitationRepo.recordClick(trackingToken);

        if (!result.invitationId) {
            return { success: false, alreadyClicked: false };
        }

        return {
            success: true,
            alreadyClicked: result.alreadyClicked,
            eventId: result.eventId ?? undefined,
        };
    } catch (error) {
        console.error('[InviteService] handleInviteClick error:', error);
        return { success: false, alreadyClicked: false };
    }
}

/**
 * Handle email bounce (called from Resend webhook via Inngest)
 */
export async function handleInviteBounce(
    invitationId: string,
    bounceReason?: string
): Promise<{ success: boolean }> {
    try {
        const invitation = await invitationRepo.markAsBounced(invitationId, bounceReason);

        if (!invitation) {
            return { success: false };
        }

        // Decrement counter for bounced invite
        const client = getAdminClient();
        await (client.rpc as any)('increment_event_counter', {
            p_event_id: invitation.eventId,
            p_counter_name: 'invites_sent',
            p_increment: -1,
        });

        return { success: true };
    } catch (error) {
        console.error('[InviteService] handleInviteBounce error:', error);
        return { success: false };
    }
}

// ===========================================
// ANALYTICS
// ===========================================

/**
 * Get invitation analytics for an event
 */
export async function getInviteAnalytics(eventId: string): Promise<InvitationStats | null> {
    return invitationRepo.getStats(eventId);
}

/**
 * Get all invites for an event with pagination
 */
export async function getEventInvites(
    eventId: string,
    options?: {
        status?: 'pending' | 'sent' | 'opened' | 'clicked' | 'accepted' | 'declined' | 'bounced';
        limit?: number;
        offset?: number;
    }
): Promise<{ invitations: Invitation[]; total: number }> {
    return invitationRepo.findByEvent(eventId, options);
}

// ===========================================
// LEGACY COMPATIBILITY
// ===========================================

// These functions maintain backward compatibility with existing code

export interface EventInvite {
    id: string;
    eventId: string;
    email: string;
    sentBy: string;
    sentByName: string;
    status: 'pending' | 'sent' | 'opened' | 'clicked' | 'accepted' | 'declined' | 'bounced';
    sentAt: Date;
}

/**
 * @deprecated Use sendInvite instead
 */
export async function sendInviteEmail(
    eventId: string,
    eventTitle: string,
    recipientEmail: string,
    senderInfo: { uid: string; name: string; email: string }
): Promise<{ success: boolean; error?: string }> {
    const result = await sendInvite({
        eventId,
        eventTitle,
        recipientEmail,
        senderInfo,
    });

    return {
        success: result.success,
        error: result.error,
    };
}

/**
 * @deprecated Use getEventInvites instead
 */
export async function getEventInvitesLegacy(eventId: string): Promise<EventInvite[]> {
    const { invitations } = await getEventInvites(eventId);

    return invitations.map((inv) => ({
        id: inv.id,
        eventId: inv.eventId,
        email: inv.email,
        sentBy: inv.invitedBy,
        sentByName: 'Unknown', // Would need to join with profiles
        status: inv.status,
        sentAt: new Date(inv.sentAt || inv.createdAt),
    }));
}

/**
 * @deprecated Use invitationRepo.updateStatus instead
 */
export async function updateInviteStatus(
    eventId: string,
    inviteId: string,
    status: 'accepted' | 'declined'
): Promise<void> {
    await invitationRepo.updateStatus(inviteId, status);
}
