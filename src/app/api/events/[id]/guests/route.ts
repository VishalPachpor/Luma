/**
 * GET /api/events/[id]/guests
 * List guests for an event with optional status filter
 * Requires: Host authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id: eventId } = await context.params;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        // 1. Init Supabase Admin Client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 2. Verify Auth
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 3. Verify Event Ownership
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        if (event.organizer_id !== user.id) {
            return NextResponse.json({ error: 'Only the host can view guest list' }, { status: 403 });
        }

        // 4. Fetch Guests
        let query = supabase
            .from('guests')
            .select('*')
            .eq('event_id', eventId);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: guests, error: guestsError } = await query;

        if (guestsError) {
            throw guestsError;
        }

        const userIds = guests.map(g => g.user_id);

        // 5. Fetch Additional Data (Profiles & RSVPs)
        const [profilesResult, rsvpsResult] = await Promise.all([
            supabase
                .from('profiles') // Changed from 'users' to 'profiles'
                .select('id, display_name, email, avatar_url')
                .in('id', userIds),

            supabase
                .from('rsvps')
                .select('user_id, answers')
                .eq('event_id', eventId)
                .in('user_id', userIds)
        ]);

        const profiles = profilesResult.data || [];
        const rsvps = rsvpsResult.data || [];

        const profileMap = new Map(profiles.map(p => [p.id, p]));
        const answersMap = new Map(rsvps.map(r => [r.user_id, r.answers]));

        const enrichedGuests = guests.map(guest => {
            const profile = profileMap.get(guest.user_id);
            const answers = answersMap.get(guest.user_id) || {};

            return {
                id: guest.id,
                userId: guest.user_id,
                eventId: guest.event_id,
                status: guest.status,
                createdAt: guest.created_at,
                // Enriched fields
                displayName: profile?.display_name || 'Guest',
                email: profile?.email || 'No email',
                photoURL: profile?.avatar_url || null,
                ticketTierId: guest.ticket_tier_id,
                orderId: guest.order_id,
                qrToken: guest.qr_token,
                answers: answers // Include answers
            };
        });

        return NextResponse.json({
            guests: enrichedGuests,
            total: enrichedGuests.length,
            status: status || 'all',
        });

    } catch (error: any) {
        console.error('[GuestsAPI] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
