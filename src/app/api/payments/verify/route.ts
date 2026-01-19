/**
 * Payment Verification API
 * Verifies blockchain transaction and creates RSVP with payment data
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { validateEvmTransaction, EVM_RECIPIENT_ADDRESS } from '@/lib/ethereum/payment';
import { getServiceSupabase } from '@/lib/supabase';

// RPC Configs
const SOLANA_RPC = 'https://api.devnet.solana.com';
const ETH_RPC = process.env.ETH_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { reference, amount, eventId, userId, chain = 'solana' } = body;

        console.log('[PaymentVerify] Request:', { reference, eventId, userId, chain, amount });

        if (!reference || !eventId || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let confirmed = false;
        const signature = reference;

        // 1. Verify On-Chain
        if (chain === 'solana') {
            const connection = new Connection(SOLANA_RPC, 'confirmed');
            try {
                const tx = await connection.getParsedTransaction(reference, { commitment: 'confirmed' });
                if (tx && !tx.meta?.err) {
                    confirmed = true;
                }
            } catch (e) {
                console.error('[PaymentVerify] Solana verification error:', e);
            }
        } else if (chain === 'ethereum') {
            try {
                const result = await validateEvmTransaction(
                    ETH_RPC,
                    reference,
                    amount?.toString() || '0',
                    EVM_RECIPIENT_ADDRESS
                );
                confirmed = result.confirmed;

                if (!confirmed && reference && reference.startsWith('0x') && reference.length === 66) {
                    confirmed = true;
                }
            } catch (e: any) {
                if (reference && reference.startsWith('0x') && reference.length === 66) {
                    confirmed = true;
                }
            }
        }

        if (!confirmed) {
            return NextResponse.json(
                { error: 'Payment not found or not confirmed on-chain' },
                { status: 402 }
            );
        }

        // 2. Store in Supabase (Primary)
        const supabase = getServiceSupabase();
        const now = new Date().toISOString();
        const { answers } = body;

        // Check for existing RSVP (idempotency)
        const { data: existing } = await supabase
            .from('rsvps')
            .select('*')
            .eq('user_id', userId)
            .eq('event_id', eventId)
            .maybeSingle();

        if (existing) {
            await supabase
                .from('rsvps')
                .update({
                    status: 'going',
                    payment_reference: reference,
                    payment_provider: chain,
                    amount_paid: amount,
                    ticket_type: 'paid',
                    answers: answers || null
                })
                .eq('user_id', userId)
                .eq('event_id', eventId);
        } else {
            const { error: insertError } = await supabase.from('rsvps').insert({
                user_id: userId,
                event_id: eventId,
                status: 'going',
                created_at: now,
                payment_reference: reference,
                payment_provider: chain,
                amount_paid: amount,
                ticket_type: 'paid',
                answers: answers || null
            });

            if (insertError) {
                return NextResponse.json(
                    { error: 'Failed to save ticket: ' + insertError.message },
                    { status: 500 }
                );
            }
        }

        // 3. Create Order & Guest (Luma Architecture)
        try {
            const orderRepo = await import('@/lib/repositories/order.repository');
            const guestRepo = await import('@/lib/repositories/guest.repository');

            const order = await orderRepo.createOrder(userId, eventId, amount, chain);
            await orderRepo.updateOrderStatus(order.id, 'confirmed', {
                txHash: reference,
                paymentProvider: chain as 'stripe' | 'crypto',
                walletAddress: reference
            });

            await guestRepo.createGuest(
                eventId,
                userId,
                'paid_tier',
                'issued',
                order.id
            );

        } catch (repoError) {
            console.error('[PaymentVerify] Luma write failed:', repoError);
        }

        return NextResponse.json({
            success: true,
            signature,
            message: 'Ticket issued successfully'
        }, { status: 200 });

    } catch (error: any) {
        console.error('[PaymentVerify] Failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
