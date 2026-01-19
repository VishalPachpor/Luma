import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id: eventId } = await context.params;

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
            console.error('[TicketAPI] No token provided');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[TicketAPI] Verifying token...');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error('[TicketAPI] Token verification failed:', authError);
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        console.log('[TicketAPI] User verified:', user.id);

        // 3. Fetch Guest Ticket
        const { data: guest, error: guestError } = await supabase
            .from('guests')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (guestError) {
            throw guestError;
        }

        if (!guest) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // 4. Normalize (match Guest type)
        const normalizedGuest = {
            id: guest.id,
            orderId: guest.order_id || 'manual',
            eventId: guest.event_id,
            ticketTierId: guest.ticket_tier_id || 'default',
            userId: guest.user_id,
            qrToken: guest.qr_token || '',
            status: guest.status,
            createdAt: guest.created_at,
            checkedInAt: guest.checked_in_at,
        };

        return NextResponse.json(normalizedGuest);

    } catch (error: any) {
        console.error('[TicketAPI] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
