/**
 * POST /api/events/[id]/guests/approve
 * Approve a guest registration request
 * Requires: Host authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
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

        // 1. Auth Check (Supabase Verification)
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getServiceSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error('[ApproveAPI] Supabase token verification failed:', authError);
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        const hostId = user.id;

        // 2. Verify Ownership (Supabase)
        // Check if ID is a valid UUID before sending to Supabase
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);

        if (!isUuid) {
            return NextResponse.json({ error: 'Invalid Event ID' }, { status: 400 });
        }

        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('id, title, organizer_id')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        if (event.organizer_id !== hostId) {
            return NextResponse.json({ error: 'Only the host can approve guests' }, { status: 403 });
        }

        // 3. Get Guest (Supabase)
        const { data: guestData, error: guestError } = await supabase
            .from('guests')
            .select('*')
            .eq('id', guestId)
            .eq('event_id', eventId)
            .single();

        if (guestError || !guestData) {
            return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
        }

        // Validate current status
        if (guestData.status !== 'pending_approval') {
            return NextResponse.json({
                error: `Cannot approve guest with status: ${guestData.status}`
            }, { status: 400 });
        }

        // 4. Update Guest (Supabase)
        // Trigger will handle attendee_count increment
        const { error: updateError } = await supabase
            .from('guests')
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

        // 5. Update RSVPs table for compatibility (Redundancy)
        await supabase
            .from('rsvps')
            .update({ status: 'going' })
            .eq('event_id', eventId)
            .eq('user_id', guestData.user_id);

        // 6. Legacy: Update Firestore (Dual Write - Best Effort)
        if (adminDb) {
            try {
                // Update Guest Doc
                await adminDb.collection('events').doc(eventId).collection('guests').doc(guestId).update({
                    status: 'issued',
                    approved_by: hostId,
                    approved_at: new Date().toISOString(),
                });

                // Update Attendees Array
                await adminDb.collection('events').doc(eventId).update({
                    attendees: require('firebase-admin').firestore.FieldValue.arrayUnion(guestData.user_id)
                });
            } catch (e) {
                console.warn('[ApproveAPI] Firestore update failed:', e);
            }
        }

        // 7. Send notification (Check if repo supports Supabase ID? It usually takes userId string)
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
            console.warn('[ApproveAPI] Notification failed:', noteError);
            return NextResponse.json({
                success: true, // Still success even if notification fails
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
