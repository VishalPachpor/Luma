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
        const orderIds = guests.map(g => g.order_id).filter(id => id); // Filter nulls

        // 5. Fetch Additional Data (Profiles, RSVPs, Orders)
        const [profilesResult, rsvpsResult, ordersResult] = await Promise.all([
            supabase
                .from('profiles') // Changed from 'users' to 'profiles'
                .select('id, display_name, email, avatar_url')
                .in('id', userIds),

            supabase
                .from('rsvps')
                .select('user_id, answers')
                .eq('event_id', eventId)
                .in('user_id', userIds),

            // Fetch orders to get transaction hashes and amounts
            orderIds.length > 0 ? supabase
                .from('orders')
                .select('id, tx_hash, total_amount')
                .in('id', orderIds) : Promise.resolve({ data: [] })
        ]);

        const profiles = profilesResult.data || [];
        const rsvps = rsvpsResult.data || [];
        const orders = ordersResult.data || [];

        const profileMap = new Map(profiles.map(p => [p.id, p]));
        const answersMap = new Map(rsvps.map(r => [r.user_id, r.answers]));
        const ordersMap = new Map(orders.map(o => [o.id, o]));

        const enrichedGuests = guests.map(guest => {
            const profile = profileMap.get(guest.user_id);
            const answers = answersMap.get(guest.user_id) || {};
            const order = guest.order_id ? ordersMap.get(guest.order_id) : null;

            // Resolve staking amount with priority:
            // 1. guest.stake_amount (High precision native token amount)
            // 2. guest.stake_amount_usd (Might be truncated)
            // 3. order.total_amount (Fallback)
            const rawStakeAmount = guest.stake_amount || guest.stake_amount_usd || order?.total_amount || 0;
            // Ensure we don't display 0.00 if we have a better value, but careful with string "0.00"
            const stakeAmount = Number(guest.stake_amount) > 0 ? guest.stake_amount :
                (Number(guest.stake_amount_usd) > 0 ? guest.stake_amount_usd :
                    (order?.total_amount || 0));

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
                answers: answers, // Include answers
                // Staking Fields
                stakeAmountUsd: stakeAmount,
                stakeCurrency: guest.stake_currency,
                stakeNetwork: guest.stake_network,
                txHash: order?.tx_hash || guest.stake_tx_hash || null
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
