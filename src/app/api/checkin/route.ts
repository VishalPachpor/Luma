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
        const { data: guestData, error: findError } = await supabase
            .from('guests')
            .select('id, user_id, ticket_tier_id, status, qr_token, stake_amount, stake_wallet_address')
            .eq('event_id', eventId)
            .eq('qr_token', qrToken)
            .maybeSingle();

        const guest = guestData as {
            id: string;
            user_id: string;
            ticket_tier_id: string | null;
            status: string;
            qr_token: string;
            stake_amount?: number;
            stake_wallet_address?: string;
        } | null;

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

        // Allow check-in for 'issued', 'staked', or 'approved' status
        const validCheckInStatuses = ['issued', 'staked', 'approved'];
        if (!validCheckInStatuses.includes(guest.status)) {
            console.log('[CheckIn API] Invalid status for check-in:', { guestId: guest.id, status: guest.status });
            return NextResponse.json(
                { error: `Invalid ticket status: ${guest.status}`, code: 'INVALID_STATUS' },
                { status: 400 }
            );
        }

        // 4. Update status to 'scanned' (checked_in equivalent - matches DB constraint)
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
            .from('guests')
            .update({
                status: 'scanned',
                previous_status: guest.status,
                checked_in_at: now,
                updated_at: now,
            })
            .eq('id', guest.id);

        if (updateError) {
            console.error('[CheckIn API] Update error:', updateError);
            return NextResponse.json(
                { error: 'Failed to check in: ' + updateError.message, code: 'UPDATE_FAILED' },
                { status: 500 }
            );
        }

        // 5. Trigger escrow release if staked (via Inngest event)
        if (guest.status === 'staked' && guest.stake_wallet_address) {
            const { inngest } = await import('@/inngest/client');
            await inngest.send({
                name: 'app/ticket_checked_in',
                data: {
                    guestId: guest.id,
                    eventId,
                    stakeWalletAddress: guest.stake_wallet_address,
                },
            });
        }

        // 6. Return success
        return NextResponse.json({
            success: true,
            alreadyScanned: false,
            guest: {
                id: guest.id,
                userId: guest.user_id,
                ticketTierId: guest.ticket_tier_id,
                status: 'scanned',
            },
            previousStatus: guest.status,
            newStatus: 'scanned',
            willReleaseEscrow: guest.status === 'staked' && !!guest.stake_wallet_address,
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
