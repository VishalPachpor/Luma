import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: eventId } = await params;
        const { emails } = await request.json();

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json({ error: 'Invalid emails' }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient();

        // 1. Verify user is event organizer
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is organizer
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('title, organizer_id')
            .eq('id', eventId)
            .single();

        if (eventError || !event || event.organizer_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // 2. Create invites in DB
        // For simplicity in this demo, we'll process one by one to generate codes
        const invitesToSend = [];

        for (const email of emails) {
            const { nanoid } = await import('nanoid');
            const code = nanoid(10);

            const { data: invite, error: inviteError } = await supabase
                .from('invites')
                .insert({
                    event_id: eventId,
                    inviter_id: user.id,
                    email,
                    code,
                    status: 'pending'
                })
                .select()
                .single();

            if (!inviteError && invite) {
                invitesToSend.push({ ...invite, eventTitle: event.title });
            }
        }

        // 3. Send emails via Resend (Background task in real app, here inline for MVP)
        // In a production app, use Inngest for this!
        if (process.env.RESEND_API_KEY) {
            await Promise.allSettled(invitesToSend.map(invite =>
                resend.emails.send({
                    from: 'Luma Clone <events@yourdomain.com>',
                    to: invite.email,
                    subject: `You're invited to ${invite.eventTitle}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2>You've been invited!</h2>
                            <p>You have been invited to join <strong>${invite.eventTitle}</strong>.</p>
                            <p>Click the button below to accept your invitation:</p>
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.code}" 
                               style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                               Accept Invitation
                            </a>
                        </div>
                    `
                })
            ));
        }

        return NextResponse.json({ success: true, count: invitesToSend.length });

    } catch (error) {
        console.error('Error sending invites:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: eventId } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: invites, error } = await supabase
        .from('invites')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(invites);
}
