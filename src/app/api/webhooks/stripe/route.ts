/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 *
 * Verifies webhook signature and processes Stripe events.
 * Handles: payment_intent.succeeded, payment_intent.payment_failed,
 *          checkout.session.completed
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-12-15.clover',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
    if (!WEBHOOK_SECRET) {
        console.error('[StripeWebhook] STRIPE_WEBHOOK_SECRET is not set');
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
    } catch (err: any) {
        console.error('[StripeWebhook] Signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                await handlePaymentSucceeded(supabase, paymentIntent);
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                await handlePaymentFailed(supabase, paymentIntent);
                break;
            }

            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(supabase, session);
                break;
            }

            default:
                console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
        }
    } catch (err: any) {
        console.error(`[StripeWebhook] Error processing event ${event.type}:`, err.message);
        // Return 200 to prevent Stripe from retrying — log the error for investigation
        // Stripe will retry on non-2xx responses, which can cause duplicate processing
    }

    // Always return 200 quickly — Stripe requires fast responses
    return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(supabase: ReturnType<typeof getServiceSupabase>, paymentIntent: Stripe.PaymentIntent) {
    const { id, metadata, amount } = paymentIntent;

    console.log('[StripeWebhook] Payment succeeded:', { id, amount, metadata });

    // Update order status if order exists with this payment_intent_id
    const { error } = await (supabase.from('orders') as any)
        .update({
            status: 'confirmed',
            updated_at: new Date().toISOString(),
        })
        .eq('payment_intent_id', id);

    if (error) {
        console.error('[StripeWebhook] Failed to update order for payment_intent:', id, error.message);
    }

    // If eventId and userId are in metadata, ensure guest record is issued
    if (metadata?.event_id && metadata?.user_id) {
        const { error: guestError } = await supabase
            .from('guests')
            .update({ status: 'issued', updated_at: new Date().toISOString() })
            .eq('event_id', metadata.event_id)
            .eq('user_id', metadata.user_id)
            .eq('status', 'pending_approval');

        if (guestError) {
            console.error('[StripeWebhook] Failed to issue ticket:', guestError.message);
        }
    }
}

async function handlePaymentFailed(supabase: ReturnType<typeof getServiceSupabase>, paymentIntent: Stripe.PaymentIntent) {
    const { id, metadata, last_payment_error } = paymentIntent;

    console.log('[StripeWebhook] Payment failed:', { id, error: last_payment_error?.message });

    const { error } = await (supabase.from('orders') as any)
        .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
        })
        .eq('payment_intent_id', id);

    if (error) {
        console.error('[StripeWebhook] Failed to update order status to failed:', id, error.message);
    }
}

async function handleCheckoutCompleted(supabase: ReturnType<typeof getServiceSupabase>, session: Stripe.Checkout.Session) {
    const { id, metadata, payment_intent, amount_total } = session;

    console.log('[StripeWebhook] Checkout completed:', { id, payment_intent, amount_total });

    if (!metadata?.event_id || !metadata?.user_id) {
        console.warn('[StripeWebhook] Checkout session missing event_id/user_id metadata:', id);
        return;
    }

    const paymentIntentId = typeof payment_intent === 'string' ? payment_intent : payment_intent?.id;

    // Upsert order record
    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error: orderError } = await (supabase.from('orders') as any).upsert({
        id: orderId,
        user_id: metadata.user_id,
        event_id: metadata.event_id,
        total_amount: amount_total ? amount_total / 100 : 0, // Stripe amounts are in cents
        currency: session.currency?.toUpperCase() || 'USD',
        status: 'confirmed',
        payment_provider: 'stripe',
        payment_intent_id: paymentIntentId,
        created_at: now,
        updated_at: now,
    }, { onConflict: 'payment_intent_id' });

    if (orderError) {
        console.error('[StripeWebhook] Order upsert failed:', orderError.message);
    }

    // Issue ticket
    const { error: guestError } = await supabase
        .from('guests')
        .upsert({
            event_id: metadata.event_id,
            user_id: metadata.user_id,
            status: 'issued',
            qr_token: crypto.randomUUID(),
            created_at: now,
            updated_at: now,
        } as any, { onConflict: 'event_id, user_id' });

    if (guestError) {
        console.error('[StripeWebhook] Failed to issue ticket on checkout:', guestError.message);
    }
}
