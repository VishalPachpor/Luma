/**
 * POST /api/events/[id]/guests/reject
 * Reject a guest registration request
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
        const { guestId, reason } = body;

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
            return NextResponse.json({ error: 'Only the host can reject guests' }, { status: 403 });
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

        if (guestData.status !== 'pending_approval') {
            return NextResponse.json({
                error: `Cannot reject guest with status: ${guestData.status}`
            }, { status: 400 });
        }

        const { error: updateError } = await (supabase
            .from('guests') as any)
            .update({
                status: 'rejected',
                approved_by: hostId, // We use same field for who acted on it
                rejection_reason: reason || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', guestId);

        if (updateError) {
            // Check if rejection_reason exists in schema. If not, retry without it.
            if (updateError.message?.includes('rejection_reason')) {
                await (supabase
                    .from('guests') as any)
                    .update({
                        status: 'rejected',
                        approved_by: hostId,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', guestId);
            } else {
                throw new Error(updateError.message);
            }
        }

        // Sync with RSVPs table
        await (supabase
            .from('rsvps') as any)
            .update({ status: 'not_going' })
            .eq('event_id', eventId)
            .eq('user_id', guestData.user_id);

        try {
            const notification = await notificationRepo.sendApprovalNotification(
                guestData.user_id,
                eventId,
                event.title,
                false, // rejected
                reason
            );

            return NextResponse.json({
                success: true,
                guest: {
                    id: guestId,
                    status: 'rejected',
                    rejection_reason: reason || null,
                },
                notification,
            });
        } catch (noteError) {
            return NextResponse.json({
                success: true,
                guest: { id: guestId, status: 'rejected' }
            });
        }

    } catch (error: any) {
        console.error('[RejectAPI] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
