/**
 * Resend Webhooks API Route
 * 
 * POST /api/webhooks/resend
 * Receives webhook events from Resend for email tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import crypto from 'crypto';

// Resend webhook signature verification
function verifySignature(
    payload: string,
    signature: string | null,
    webhookSecret: string
): boolean {
    if (!signature || !webhookSecret) return false;

    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

interface ResendWebhookEvent {
    type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' |
    'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';
    created_at: string;
    data: {
        email_id: string;
        from: string;
        to: string[];
        subject: string;
        created_at: string;
        // Additional fields based on event type
        click?: { link: string };
        bounce?: { message: string };
    };
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('svix-signature');
        const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

        // Verify signature in production
        if (process.env.NODE_ENV === 'production' && webhookSecret) {
            if (!verifySignature(rawBody, signature, webhookSecret)) {
                console.error('[ResendWebhook] Invalid signature');
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 401 }
                );
            }
        }

        const event = JSON.parse(rawBody) as ResendWebhookEvent;
        console.log('[ResendWebhook] Received event:', event.type);

        // Extract invitation ID from email subject or metadata
        // Format: "{senderName} invited you to {eventTitle}"
        // We need to look up the invitation by recipient email
        const recipientEmail = event.data.to[0];

        // For bounces and complaints, forward to Inngest for processing
        if (event.type === 'email.bounced' || event.type === 'email.complained') {
            // Note: In production, you'd look up the invitation by email
            // For now, we just log it
            console.log(`[ResendWebhook] ${event.type} for ${recipientEmail}`);

            // Forward to Inngest if we have invitation tracking
            // await inngest.send({
            //     name: 'resend/email.event',
            //     data: {
            //         type: event.type === 'email.bounced' ? 'bounced' : 'complained',
            //         recipientEmail,
            //         reason: event.data.bounce?.message,
            //     },
            // });
        }

        // For opens and clicks, we primarily use the tracking pixel/link
        // Resend webhooks are backup tracking
        if (event.type === 'email.opened' || event.type === 'email.clicked') {
            console.log(`[ResendWebhook] ${event.type} for ${recipientEmail}`);
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('[ResendWebhook] Error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}
