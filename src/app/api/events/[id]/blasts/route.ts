/**
 * Event Blasts API Route
 * 
 * POST /api/events/[id]/blasts — Create and send a blast
 * GET  /api/events/[id]/blasts — List all blasts for an event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase';
import { inngest } from '@/inngest/client';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: eventId } = await params;
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminSupabase = getServiceSupabase();

        // Verify user is organizer of this event
        const { data: event } = await adminSupabase
            .from('events')
            .select('organizer_id, title')
            .eq('id', eventId)
            .single();

        if (!event || event.organizer_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Fetch blasts
        const { data: blasts, error } = await adminSupabase
            .from('event_blasts')
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Blasts] Fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch blasts' }, { status: 500 });
        }

        return NextResponse.json({ blasts: blasts || [] });
    } catch (error) {
        console.error('[Blasts] GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: eventId } = await params;
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminSupabase = getServiceSupabase();

        // Verify user is organizer of this event
        const { data: event } = await adminSupabase
            .from('events')
            .select('organizer_id, title')
            .eq('id', eventId)
            .single();

        if (!event || event.organizer_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        const body = await request.json();
        const { subject, message, recipientFilter = 'all' } = body;

        if (!subject || !message) {
            return NextResponse.json(
                { error: 'Subject and message are required' },
                { status: 400 }
            );
        }

        // Get guest count for the filter
        let countQuery = adminSupabase
            .from('guests')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', eventId);

        switch (recipientFilter) {
            case 'approved':
                countQuery = countQuery.in('status', ['issued', 'approved']);
                break;
            case 'pending':
                countQuery = countQuery.eq('status', 'pending_approval');
                break;
            case 'checked_in':
                countQuery = countQuery.eq('status', 'scanned');
                break;
        }

        const { count: recipientCount } = await countQuery;

        // Create blast record
        const blastId = crypto.randomUUID();
        const { error: insertError } = await adminSupabase
            .from('event_blasts')
            .insert({
                id: blastId,
                event_id: eventId,
                sender_id: user.id,
                subject,
                message,
                recipient_filter: recipientFilter,
                recipient_count: recipientCount || 0,
                status: 'sending',
                sent_count: 0,
                failed_count: 0,
            });

        if (insertError) {
            console.error('[Blasts] Insert error:', insertError);
            return NextResponse.json({ error: 'Failed to create blast' }, { status: 500 });
        }

        // Trigger Inngest function to send emails
        await inngest.send({
            name: 'app/blast.created',
            data: {
                blastId,
                eventId,
                eventTitle: event.title,
                subject,
                message,
                senderName: user.user_metadata?.name || user.email || 'Event Organizer',
                recipientFilter,
            },
        });

        return NextResponse.json({
            success: true,
            blast: {
                id: blastId,
                subject,
                recipientCount: recipientCount || 0,
                status: 'sending',
            },
        });
    } catch (error) {
        console.error('[Blasts] POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
