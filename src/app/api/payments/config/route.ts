/**
 * Payment Config API
 * Returns the payment configuration for a given event (wallet address, network, tokens)
 * 
 * GET /api/payments/config?eventId=<uuid>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service-level Supabase client (bypasses RLS for public read)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json(
                { error: 'Missing eventId parameter' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Fetch the event to get its calendar_id
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('id, calendar_id, title')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        // If event has no calendar, return defaults
        if (!event.calendar_id) {
            return NextResponse.json({
                wallet_address: null,
                network: 'ethereum',
                accepted_tokens: ['ETH', 'USDC'],
                configured: false
            });
        }

        // 2. Fetch the payment config for this calendar
        const { data: config, error: configError } = await supabase
            .from('calendar_payment_config')
            .select('wallet_address, network, accepted_tokens')
            .eq('calendar_id', event.calendar_id)
            .single();

        if (configError && configError.code !== 'PGRST116') {
            // Real error (not just "not found")
            console.error('[PaymentConfig] Error:', configError);
            return NextResponse.json(
                { error: 'Failed to fetch payment config' },
                { status: 500 }
            );
        }

        // 3. Return the config (or defaults if not configured)
        if (!config || !config.wallet_address) {
            return NextResponse.json({
                wallet_address: null,
                network: 'ethereum',
                accepted_tokens: ['ETH', 'USDC'],
                configured: false
            });
        }

        return NextResponse.json({
            wallet_address: config.wallet_address,
            network: config.network || 'ethereum',
            accepted_tokens: config.accepted_tokens || ['ETH', 'USDC'],
            configured: true
        });

    } catch (error: any) {
        console.error('[PaymentConfig] Failed:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
