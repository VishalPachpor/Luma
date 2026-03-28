/**
 * Payment Verification API
 * Verifies blockchain transaction and creates RSVP with payment data.
 *
 * - Dynamically fetches recipient wallet from calendar_payment_config
 * - Supports both Ethereum and Solana verification
 * - Idempotent ticket issuance
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { validateEvmTransaction } from '@/lib/ethereum/payment';
import { getServiceSupabase } from '@/lib/supabase';

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const ETH_RPC = process.env.ETH_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export async function POST(request: NextRequest) {
    const supabase = getServiceSupabase();

    try {
        const body = await request.json();
        const { reference, amount, amountUsd, eventId, userId, answers, chain = 'ethereum', token, isStake } = body;

        console.log('[PaymentVerify] Request:', { reference, eventId, userId, chain, amount, amountUsd, isStake });

        if (!reference || !eventId || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch event and its calendar's payment config
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('id, calendar_id, require_approval')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        let expectedRecipient: string | null = null;

        if (event.calendar_id) {
            const { data: config } = await (supabase as any)
                .from('calendar_payment_config')
                .select('wallet_address, network')
                .eq('calendar_id', event.calendar_id)
                .single();

            if (config?.wallet_address) {
                expectedRecipient = config.wallet_address;
            }
        }

        // Recipient wallet is required for payment verification
        if (!expectedRecipient) {
            console.error('[PaymentVerify] No recipient wallet configured for event', eventId);
            return NextResponse.json(
                { error: 'Payment configuration missing: no recipient wallet set for this event' },
                { status: 500 }
            );
        }

        let confirmed = false;
        const signature = reference;

        // 2. Verify On-Chain
        if (chain === 'solana') {
            const connection = new Connection(SOLANA_RPC, 'confirmed');
            try {
                const tx = await connection.getParsedTransaction(reference, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0,
                });

                if (tx && !tx.meta?.err) {
                    // Verify recipient is in the transaction's account keys
                    const recipientKey = new PublicKey(expectedRecipient);
                    const accountKeys = tx.transaction.message.accountKeys.map(k =>
                        typeof k === 'string' ? k : k.pubkey.toString()
                    );

                    if (!accountKeys.includes(recipientKey.toString())) {
                        console.error('[PaymentVerify] Solana tx recipient mismatch — rejecting');
                        return NextResponse.json(
                            { error: 'Payment verification failed: transaction recipient does not match' },
                            { status: 402 }
                        );
                    }

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
                    expectedRecipient
                );
                confirmed = result.confirmed;

                // Testnet fallback: only in non-production environments
                if (!confirmed && !IS_PRODUCTION && reference?.startsWith('0x') && reference.length === 66) {
                    console.log('[PaymentVerify] Accepting valid tx hash format for testnet (non-production only)');
                    confirmed = true;
                }
            } catch (e: any) {
                console.error('[PaymentVerify] Ethereum verification error:', e);
                // Testnet fallback on RPC error — non-production only
                if (!IS_PRODUCTION && reference?.startsWith('0x') && reference.length === 66) {
                    console.log('[PaymentVerify] Fallback: accepting tx hash format after RPC error (non-production only)');
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

        // 3. Auto-populate registration answers from user profile if missing
        let finalAnswers = answers || {};
        if (!answers || Object.keys(answers).length === 0) {
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('display_name, email')
                .eq('id', userId)
                .single();

            const { data: authUser } = await supabase.auth.admin.getUserById(userId);

            const userName = userProfile?.display_name ||
                authUser?.user?.user_metadata?.full_name ||
                authUser?.user?.user_metadata?.name ||
                authUser?.user?.email?.split('@')[0] ||
                'Guest';

            const userEmail = userProfile?.email || authUser?.user?.email || '';

            if (userName) finalAnswers['full_name'] = userName;
            if (userEmail) finalAnswers['email'] = userEmail;
        }

        // 4. Store RSVP (Idempotent)
        const now = new Date().toISOString();

        const { error: rsvpError } = await supabase
            .from('rsvps')
            .upsert({
                user_id: userId,
                event_id: eventId,
                status: 'going',
                created_at: now,
            }, { onConflict: 'user_id, event_id' });

        if (rsvpError) {
            console.error('[PaymentVerify] RSVP upsert failed:', rsvpError);
            return NextResponse.json(
                { error: 'Failed to save RSVP: ' + rsvpError.message },
                { status: 500 }
            );
        }

        // 5. Create Order record
        let finalOrderId: string | null = null;
        let orderWarning: string | null = null;

        try {
            const orderId = crypto.randomUUID();
            const { error: orderError } = await (supabase.from('orders') as any).insert({
                id: orderId,
                user_id: userId,
                event_id: eventId,
                total_amount: amount,
                currency: 'USD',
                status: 'confirmed',
                payment_provider: chain,
                payment_intent_id: reference,
                tx_hash: reference,
                created_at: now,
                updated_at: now,
            });

            if (orderError) {
                console.error('[PaymentVerify] Order insert failed:', {
                    error: orderError.message,
                    userId,
                    eventId,
                    txHash: reference,
                    amount,
                });
                orderWarning = 'Order record could not be created — payment was confirmed but reconciliation may be needed';
            } else {
                finalOrderId = orderId;
            }
        } catch (orderEx: any) {
            console.error('[PaymentVerify] Order creation crashed:', orderEx);
            orderWarning = 'Order record could not be created';
        }

        // 6. Issue Ticket (Guest record)
        try {
            const { data: tiers } = await supabase
                .from('ticket_tiers')
                .select('*')
                .eq('event_id', eventId);

            // Find the matching tier by token/name, or fall back to first paid tier, then first tier
            const targetTier = tiers?.find(t => token && t.name?.toLowerCase() === token.toLowerCase())
                || tiers?.find(t => t.price > 0)
                || tiers?.[0];

            const ticketTierId = targetTier?.id || null;

            // Increment sold count
            if (targetTier) {
                const { error: rpcError } = await supabase.rpc('increment_ticket_sold_count', {
                    tier_id: targetTier.id,
                    amount: 1,
                });

                if (rpcError) {
                    const currentSold = targetTier.sold_count || 0;
                    await supabase.from('ticket_tiers')
                        .update({ sold_count: currentSold + 1 })
                        .eq('id', targetTier.id);
                }
            }

            // Determine initial guest status
            let initialStatus = event.require_approval ? 'pending_approval' : 'issued';
            if (isStake) initialStatus = 'staked';

            const guestData: any = {
                event_id: eventId,
                user_id: userId,
                ticket_tier_id: ticketTierId,
                status: initialStatus,
                order_id: finalOrderId,
                qr_token: crypto.randomUUID(),
                created_at: now,
                updated_at: now,
                registration_responses: finalAnswers,
            };

            if (isStake) {
                guestData.stake_amount = amount;
                guestData.stake_amount_usd = amountUsd || amount;
                guestData.stake_currency = token || 'ETH';
                guestData.stake_network = chain;
                guestData.stake_tx_hash = reference;
                guestData.stake_wallet_address = null;
            }

            const { error: guestError } = await supabase
                .from('guests')
                .upsert(guestData, { onConflict: 'event_id, user_id' });

            if (guestError) {
                console.error('[PaymentVerify] Guest insert failed:', guestError);
                throw new Error('Failed to issue ticket: ' + guestError.message);
            }
        } catch (error: any) {
            console.error('[PaymentVerify] Ticket issuance failed:', error);
            return NextResponse.json(
                { error: 'Payment confirmed but ticket issuance failed: ' + error.message },
                { status: 500 }
            );
        }

        console.log('[PaymentVerify] Success:', { eventId, userId, chain, txHash: reference });

        return NextResponse.json({
            success: true,
            signature,
            message: 'Ticket issued successfully',
            ...(orderWarning ? { order_warning: orderWarning } : {}),
        }, { status: 200 });

    } catch (error: any) {
        console.error('[PaymentVerify] Failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
