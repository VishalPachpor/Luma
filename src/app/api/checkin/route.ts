/**
 * Check-in API
 * POST /api/checkin
 * Validates QR token and marks guest as checked in
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { qrToken, eventId } = body;

        // Validate required fields
        if (!qrToken || !eventId) {
            return NextResponse.json(
                { error: 'Missing required fields: qrToken, eventId' },
                { status: 400 }
            );
        }

        // 1. Init Supabase Admin Client
        const supabase = getServiceSupabase();

        // 2. Find guest by QR token (Bypass RLS)
        const { data: guest, error: findError } = await supabase
            .from('guests')
            .select('id, user_id, ticket_tier_id, status, qr_token')
            .eq('event_id', eventId)
            .eq('qr_token', qrToken)
            .maybeSingle();

        if (findError) {
            console.error('[CheckIn API] Find error:', findError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!guest) {
            return NextResponse.json(
                { error: 'Invalid ticket', code: 'INVALID_TOKEN' },
                { status: 404 }
            );
        }

        // 3. Check status
        if (guest.status === 'scanned') {
            return NextResponse.json({
                success: true,
                alreadyScanned: true,
                guest: {
                    id: guest.id,
                    userId: guest.user_id,
                    ticketTierId: guest.ticket_tier_id,
                    status: 'scanned',
                },
                message: 'Already checked in'
            });
        }

        if (guest.status !== 'issued') {
            return NextResponse.json(
                { error: `Invalid ticket status: ${guest.status}`, code: 'INVALID_STATUS' },
                { status: 400 }
            );
        }

        // 4. Update status to 'scanned'
        const { error: updateError } = await supabase
            .from('guests')
            .update({
                status: 'scanned',
                checked_in_at: new Date().toISOString()
            })
            .eq('id', guest.id);

        if (updateError) {
            console.error('[CheckIn API] Update error:', updateError);
            return NextResponse.json(
                { error: 'Failed to update check-in status', code: 'UPDATE_FAILED' },
                { status: 500 }
            );
        }

        // 5. Return success
        return NextResponse.json({
            success: true,
            alreadyScanned: false,
            guest: {
                id: guest.id,
                userId: guest.user_id,
                ticketTierId: guest.ticket_tier_id,
                status: 'scanned',
            },
            message: 'Check-in successful'
        });

    } catch (error: any) {
        console.error('[CheckIn API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
