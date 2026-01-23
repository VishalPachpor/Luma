/**
 * Inngest Function: Handle Invite Created
 * 
 * Triggered when a new invitation is created.
 * Sends email via Resend with tracking pixel.
 * Updates invitation status to 'sent' on success.
 */

import { inngest } from '@/inngest/client';
import * as invitationRepo from '@/lib/repositories/invitation.repository';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface InviteCreatedEvent {
    data: {
        invitationId: string;
        eventId: string;
        eventTitle: string;
        recipientEmail: string;
        recipientName?: string;
        senderName: string;
        senderEmail: string;
        trackingToken: string;
    };
}

export const handleInviteCreated = inngest.createFunction(
    {
        id: 'handle-invite-created',
        retries: 3,
        onFailure: async ({ event, error }) => {
            // Mark as bounced on permanent failure
            // The event.data contains the original event payload
            const originalEvent = event?.data?.event?.data as InviteCreatedEvent['data'] | undefined;
            const invitationId = originalEvent?.invitationId;
            if (invitationId) {
                await invitationRepo.markAsBounced(
                    invitationId,
                    error?.message || 'Email delivery failed after retries'
                );
            }
        },
    },
    { event: 'app/invite.created' },
    async ({ event, step }) => {
        const {
            invitationId,
            eventId,
            eventTitle,
            recipientEmail,
            recipientName,
            senderName,
            trackingToken,
        } = event.data as InviteCreatedEvent['data'];

        // Step 1: Send email via Resend
        const emailResult = await step.run('send-invitation-email', async () => {
            // Build tracking pixel URL
            const trackingPixelUrl = `${APP_URL}/api/invites/${trackingToken}/track`;

            // Build event URL with tracking
            const eventUrl = `${APP_URL}/events/${eventId}?ref=invite&t=${trackingToken}`;

            // If Resend is not configured, return mock success
            if (!RESEND_API_KEY) {
                console.log('[Invite] Mock sending invitation:');
                console.log(`  To: ${recipientEmail}`);
                console.log(`  Event: ${eventTitle}`);
                console.log(`  Tracking: ${trackingToken}`);
                return { success: true, mock: true, messageId: 'mock-' + invitationId };
            }

            const displayName = recipientName || 'there';

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: FROM_EMAIL,
                    to: [recipientEmail],
                    subject: `${senderName} invited you to ${eventTitle}`,
                    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 40px 30px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                You're Invited! 🎉
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                                Hi ${displayName},
                            </p>
                            
                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                                <strong>${senderName}</strong> has invited you to an event:
                            </p>
                            
                            <!-- Event Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; margin: 24px 0;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #1f2937;">
                                            ${eventTitle}
                                        </h2>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 24px 0;">
                                        <a href="${eventUrl}" 
                                           style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                                            View Event & RSVP →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0; font-size: 14px; color: #9ca3af; text-align: center;">
                                If you weren't expecting this email, you can safely ignore it.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                Sent via Luma • <a href="${APP_URL}" style="color: #6366f1;">luma.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    
    <!-- Tracking Pixel -->
    <img src="${trackingPixelUrl}" width="1" height="1" style="display: none;" alt="" />
</body>
</html>
                    `,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
            }

            const result = await response.json();
            return { success: true, mock: false, messageId: result.id };
        });

        // Step 2: Mark invitation as sent
        if (emailResult.success) {
            await step.run('mark-as-sent', async () => {
                await invitationRepo.markAsSent(invitationId);
                return { updated: true };
            });
        }

        return {
            success: emailResult.success,
            mock: emailResult.mock,
            messageId: emailResult.messageId,
            invitationId,
        };
    }
);

/**
 * Inngest Function: Handle Email Events from Resend Webhooks
 * 
 * Processes webhook events for:
 * - email.opened
 * - email.clicked
 * - email.bounced
 * - email.complained
 */
export const handleEmailWebhook = inngest.createFunction(
    { id: 'handle-email-webhook' },
    { event: 'resend/email.event' },
    async ({ event, step }) => {
        const { type, invitationId, reason } = event.data as {
            type: 'opened' | 'clicked' | 'bounced' | 'complained';
            invitationId: string;
            reason?: string;
        };

        switch (type) {
            case 'bounced':
            case 'complained':
                await step.run('handle-bounce', async () => {
                    await invitationRepo.markAsBounced(invitationId, reason);
                    return { handled: true };
                });
                break;

            // Note: Opens and clicks are primarily handled via tracking pixel/link
            // Resend webhooks are backup tracking
            case 'opened':
            case 'clicked':
                // These are handled by the tracking pixel/link endpoints
                // Webhook is for backup/redundancy
                break;
        }

        return { type, invitationId, handled: true };
    }
);
