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
        // We trigger one event per email to allow individual retries/failures, 
        // OR one batch event if the handler supports it. The current handler seems designed for single event.
        // Let's iterate and send events.

        if (results.filter(r => r.status === 'sent').length > 0) {
            const events = results
                .filter(r => r.status === 'sent')
                .map(r => ({
                    name: "app/invite.sent",
                    data: {
                        eventId: eventId,
                        eventTitle: "Event", // We need to fetch title or pass it. 
                        // Optimization: Fetch event title once above or assume handler fetches it.
                        // Handler expects 'eventTitle'. Let's fetch it quickly or pass a placeholder if we want to be fast.
                        // Better: Fetch event details at start of API for auth checks anyway? 
                        // We used 'canManageEvent' which checks DB but doesn't return title.
                        // For now let's use a placeholder or quick fetch.
                        // Let's quickly fetch title for the email variable.
                        recipientEmail: r.email,
                        senderName: user.email // Or better display name
                    }
                }));

            // We need event title. Let's fetch it if we haven't.
            const { data: eventData } = await (supabase.from('events' as any).select('title').eq('id', eventId).single() as any);
            const realEventTitle = eventData?.title || "Upcoming Event";

            // Update events with real title
            events.forEach(e => e.data.eventTitle = realEventTitle);

            // Try to send via Inngest - but handle gracefully if not configured
            try {
                await inngest.send(events);
                console.log(`[Invite API] Triggered ${events.length} Inngest events`);
            } catch (inngestError: any) {
                // Inngest not configured - log warning but don't fail the request
                // Emails won't be sent, but invitations are still created
                console.warn(`[Invite API] Inngest not configured, emails will not be sent:`, inngestError.message);
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('[Invite API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
