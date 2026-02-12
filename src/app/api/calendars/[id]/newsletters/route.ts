/**
 * Calendar Newsletters API Route
 * 
 * POST /api/calendars/[id]/newsletters — Create and send a newsletter
 * GET  /api/calendars/[id]/newsletters — List all newsletters for a calendar
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
        const { id: calendarId } = await params;
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminSupabase = getServiceSupabase();

        // Verify user owns this calendar
        const { data: calendar } = await adminSupabase
            .from('calendars')
            .select('user_id, name')
            .eq('id', calendarId)
            .single();

        if (!calendar || calendar.user_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        const { data: newsletters, error } = await adminSupabase
            .from('calendar_newsletters')
            .select('*')
            .eq('calendar_id', calendarId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Newsletters] Fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch newsletters' }, { status: 500 });
        }

        return NextResponse.json({ newsletters: newsletters || [] });
    } catch (error) {
        console.error('[Newsletters] GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: calendarId } = await params;
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminSupabase = getServiceSupabase();

        // Verify user owns this calendar
        const { data: calendar } = await adminSupabase
            .from('calendars')
            .select('user_id, name')
            .eq('id', calendarId)
            .single();

        if (!calendar || calendar.user_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        const body = await request.json();
        const { subject, message } = body;

        if (!subject || !message) {
            return NextResponse.json(
                { error: 'Subject and message are required' },
                { status: 400 }
            );
        }

        // Get subscriber count from calendar_subscribers
        const { count: subscriberCount } = await adminSupabase
            .from('calendar_subscribers')
            .select('id', { count: 'exact', head: true })
            .eq('calendar_id', calendarId);

        // Create newsletter record
        const newsletterId = crypto.randomUUID();
        const { error: insertError } = await adminSupabase
            .from('calendar_newsletters')
            .insert({
                id: newsletterId,
                calendar_id: calendarId,
                sender_id: user.id,
                subject,
                message,
                recipient_count: subscriberCount || 0,
                status: 'sending',
                sent_count: 0,
                failed_count: 0,
            });

        if (insertError) {
            console.error('[Newsletters] Insert error:', insertError);
            return NextResponse.json({ error: 'Failed to create newsletter' }, { status: 500 });
        }

        // Trigger Inngest function to send emails
        await inngest.send({
            name: 'app/newsletter.created',
            data: {
                newsletterId,
                calendarId,
                calendarName: calendar.name,
                subject,
                message,
                senderName: user.user_metadata?.name || user.email || 'Calendar Admin',
            },
        });

        return NextResponse.json({
            success: true,
            newsletter: {
                id: newsletterId,
                subject,
                recipientCount: subscriberCount || 0,
                status: 'sending',
            },
        });
    } catch (error) {
        console.error('[Newsletters] POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
