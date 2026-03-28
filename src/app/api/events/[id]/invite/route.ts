/**
 * Invite API
 * POST /api/events/:id/invite
 * Create invitations and send emails.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { canManageEvent } from '@/lib/services/permissions.service';
import { inngest } from "@/inngest/client";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: eventId } = await context.params;

    try {
        const body = await request.json();
        const { emails } = body as { emails: string[] };

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json({ error: 'No emails provided' }, { status: 400 });
        }

        // 1. Auth Check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const supabase = getServiceSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const hasPermission = await canManageEvent(user.id, eventId);
        if (!hasPermission) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch event title up front for email use
        const { data: eventData } = await (supabase.from('events' as any).select('title').eq('id', eventId).single() as any);
        const eventTitle = eventData?.title || 'Upcoming Event';

        // 2. Process Invites
        const results = [];

        // 2.1 Check Limits
        const { data: limitData } = await (supabase
            .from('invite_limits' as any)
            .select('limit_count, used_count')
            .eq('event_id', eventId)
            .maybeSingle() as any);

        const limit = limitData?.limit_count ?? 50; // Default limit
        const used = limitData?.used_count ?? 0;
        const remaining = limit - used;

        if (emails.length > remaining) {
            return NextResponse.json({
                error: `Invite limit reached. You have ${remaining} invites left.`
            }, { status: 400 });
        }

        // 2.2 Update Limit immediately (Optimistic locking via SQL would be better but simple increment here works for Phase 1)
        await (supabase
            .from('invite_limits' as any)
            .upsert({
                event_id: eventId,
                limit_count: limit,
                used_count: used + emails.length
            }) as any);

        for (const email of emails) {
            // 2a. Create/Insert Invitation
            // Using upsert locally to avoid double invites? Or just insert and ignore conflicts upon unique constraint
            const { error: inviteError } = await (supabase
                .from('invitations' as any)
                .insert({
                    event_id: eventId,
                    email: email,
                    invited_by: user.id,
                    status: 'sent' // Assume sent immediately via service
                }) as any);

            if (inviteError) {
                // If unique constraint violation, check if we should resend
                if (inviteError.code === '23505') {
                    // Fetch the existing invite to check status
                    const { data: existingInvite } = await (supabase
                        .from('invitations' as any)
                        .select('status')
                        .eq('event_id', eventId)
                        .eq('email', email)
                        .single() as any);

                    if (existingInvite && (existingInvite.status === 'sent' || existingInvite.status === 'draft' || existingInvite.status === 'failed')) {
                        // Resend scenario: We treat this as a success to trigger the email again
                        results.push({ email, status: 'sent', resend: true });
                    } else {
                        // Already accepted/declined, or some other state we shouldn't disturb
                        results.push({ email, status: 'failed', reason: 'Already invited (responded)' });
                        continue; // Skip contact book update
                    }
                } else {
                    console.warn(`Failed to invite ${email}:`, inviteError.message);
                    results.push({ email, status: 'failed', reason: inviteError.message });
                    continue;
                }
            }

            // 2b. Add to Contact Book (Upsert)
            // If contact exists, increment count and update last_invited
            // We use raw SQL or careful separate calls. Here we try upsert if unique constraint on owner_id+email
            await (supabase
                .from('contact_book' as any)
                .upsert({
                    owner_id: user.id,
                    email: email,
                    last_invited_at: new Date().toISOString(),
                    // invite_count: db_increment() // Hard via simple upsert, simpler:
                    // For Phase 1, we just overwrite/ensure it exists. Phase 2 logic improves count.
                }, { onConflict: 'owner_id,email' }) as any);

            results.push({ email, status: 'sent' });
        }

        // 3. Send Emails (via Inngest Background Job)
        let emailsQueued = false;
        const sentResults = results.filter(r => r.status === 'sent');

        if (sentResults.length > 0) {
            const inngestEvents = sentResults.map(r => ({
                name: 'app/invite.sent' as const,
                data: {
                    eventId,
                    eventTitle,
                    recipientEmail: r.email,
                    senderName: user.user_metadata?.full_name || user.email || 'Event Organizer',
                },
            }));

            try {
                await inngest.send(inngestEvents);
                emailsQueued = true;
                console.log(`[Invite API] Triggered ${inngestEvents.length} Inngest events`);
            } catch (inngestError: any) {
                console.warn('[Invite API] Inngest unavailable, emails will not be sent:', inngestError.message);
            }
        }

        return NextResponse.json({
            success: true,
            results,
            emailsQueued,
            ...(sentResults.length > 0 && !emailsQueued
                ? { warning: 'Invitations created but email delivery is currently unavailable' }
                : {}),
        });

    } catch (error: any) {
        console.error('[Invite API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
