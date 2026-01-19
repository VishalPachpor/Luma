/**
 * RSVP API Route
 * POST /api/events/:id/rsvp
 * Handles event registration with server-side validation and Supabase RLS bypass (if needed).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
// import { sendConfirmationEmail } from '@/lib/email'; // Future

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: eventId } = await context.params;

    try {
        const body = await request.json();
        const { name, email, userId } = body; // userId might come from body if guest mode, or auth

        // 1. Auth / User Resolution
        // Ideally checking auth header if logged in user
        const authHeader = request.headers.get('Authorization');
        let authenticatedUserId = null;
        const supabase = getServiceSupabase();

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split('Bearer ')[1];
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) authenticatedUserId = user.id;
        }

        // If no auth, and we support guest RSVP, we use provided email
        // For now, let's assume strict auth or simple guest mode
        const rsvpUserId = authenticatedUserId || userId;

        if (!rsvpUserId && !email) {
            return NextResponse.json({ error: 'User or Email required' }, { status: 400 });
        }

        // 2. Validate Event & Capacity
        const { data: event } = await supabase.from('events').select('capacity, status, require_approval').eq('id', eventId).single();
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        // Check Capacity (Pseudo-code as we need efficient count)
        const { count } = await supabase.from('guests').select('*', { count: 'exact', head: true }).eq('event_id', eventId);

        if (event.capacity && (count || 0) >= event.capacity) {
            return NextResponse.json({ error: 'Event at capacity' }, { status: 409 });
        }

        // 3. Create RSVP / Guest Record
        const status = event.require_approval ? 'pending_approval' : 'issued';
        const qrToken = crypto.randomUUID(); // Simple unique token

        const { data: guest, error: createError } = await supabase
            .from('guests')
            .insert({
                event_id: eventId,
                user_id: rsvpUserId, // Note: guests table needs user_id FK, if guest is unauthed we might fail FK constraint unless we create profile
                status: status,
                qr_token: qrToken,
                // ticket_tier_id: ...
            })
            .select()
            .single();

        if (createError) {
            console.error('RSVP Create Error:', createError);
            return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
        }

        // 4. Send Confirmation (Async/Inngest)
        // await inngest.send('event/rsvp.created', { guest });

        return NextResponse.json({
            success: true,
            status: status,
            qrToken: qrToken
        });

    } catch (error) {
        console.error('[RSVP API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
