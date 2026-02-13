/**
 * POST /api/events/[id]/guests/approve
 * Approve a guest registration request
 */

import { NextRequest, NextResponse } from 'next/server';
import * as notificationRepo from '@/lib/repositories/notification.repository';
import { getServiceSupabase } from '@/lib/supabase';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id: eventId } = await context.params;
        const body = await request.json();
        const { guestId, note } = body;

        if (!guestId) {
            return NextResponse.json({ error: 'guestId is required' }, { status: 400 });
        }

        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getServiceSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        const hostId = user.id;

        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('id, title, organizer_id')
            .eq('id', eventId)
            .single();

        const event = eventData as { id: string; title: string; organizer_id: string } | null;

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        if (event.organizer_id !== hostId) {
            return NextResponse.json({ error: 'Only the host can approve guests' }, { status: 403 });
        }

        const { data: rawGuestData, error: guestError } = await supabase
            .from('guests')
            .select('*')
            .eq('id', guestId)
            .eq('event_id', eventId)
            .single();

        const guestData = rawGuestData as { id: string; user_id: string; status: string } | null;

        if (guestError || !guestData) {
            return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
        }

        if (guestData.status !== 'pending_approval' && guestData.status !== 'staked') {
            return NextResponse.json({
                error: `Cannot approve guest with status: ${guestData.status}`
            }, { status: 400 });
        }

        const { error: updateError } = await (supabase
            .from('guests') as any)
            .update({
                status: 'issued',
                approved_by: hostId,
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', guestId);

        if (updateError) {
            throw new Error(updateError.message);
        }

        // Sync with rsvps table if exists
        await (supabase
            .from('rsvps') as any)
            .update({ status: 'going' })
            .eq('event_id', eventId)
            .eq('user_id', guestData.user_id);

        try {
            const notification = await notificationRepo.sendApprovalNotification(
                guestData.user_id,
                eventId,
                event.title,
                true, // approved
                note
            );

            return NextResponse.json({
                success: true,
                guest: {
                    id: guestId,
                    status: 'issued',
                    approved_by: hostId,
                    approved_at: new Date().toISOString(),
                },
                notification,
            });
        } catch (noteError) {
            return NextResponse.json({
                success: true,
                guest: { id: guestId, status: 'issued' }
            });
        }

    } catch (error: any) {
        console.error('[ApproveAPI] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
