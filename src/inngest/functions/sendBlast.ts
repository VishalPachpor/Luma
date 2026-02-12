/**
 * Inngest Function: Send Blast Email
 * 
 * Triggered when a blast is created.
 * Sends bulk email to event guests via Resend.
 * Uses batch sending for efficiency.
 */

import { inngest } from '@/inngest/client';
import { getServiceSupabase } from '@/lib/supabase';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface BlastEmailEvent {
    data: {
        blastId: string;
        eventId: string;
        eventTitle: string;
        subject: string;
        message: string;
        senderName: string;
        recipientFilter: 'all' | 'approved' | 'pending' | 'checked_in';
    };
}

export const sendBlastEmail = inngest.createFunction(
    {
        id: 'send-blast-email',
        retries: 2,
        concurrency: { limit: 5 },
    },
    { event: 'app/blast.created' },
    async ({ event, step }) => {
        const {
            blastId,
            eventId,
            eventTitle,
            subject,
            message,
            senderName,
            recipientFilter,
        } = event.data as BlastEmailEvent['data'];

        const supabase = getServiceSupabase();

        // Step 1: Get recipients based on filter
        const recipients = await step.run('get-recipients', async () => {
            // Get guests with user emails
            let query = supabase
                .from('guests')
                .select(`
                    id,
                    user_id,
                    status
                `)
                .eq('event_id', eventId);

            // Apply status filter
            switch (recipientFilter) {
                case 'approved':
                    query = query.in('status', ['issued', 'approved']);
                    break;
                case 'pending':
                    query = query.eq('status', 'pending_approval');
                    break;
                case 'checked_in':
                    query = query.eq('status', 'scanned');
                    break;
                case 'all':
                default:
                    // No filter — all guests
                    break;
            }

            const { data: guests, error } = await query;
            if (error) throw new Error(`Failed to fetch guests: ${error.message}`);

            // Get emails for each user
            const userIds = (guests || []).map(g => g.user_id).filter(Boolean);
            if (userIds.length === 0) return [];

            // Batch fetch user emails from auth.users via admin API
            const emails: string[] = [];
            for (const userId of userIds) {
                const { data: { user } } = await supabase.auth.admin.getUserById(userId);
                if (user?.email) {
                    emails.push(user.email);
                }
            }

            return emails;
        });

        if (!recipients || recipients.length === 0) {
            // Update blast status to completed with 0 sent
            await step.run('mark-no-recipients', async () => {
                await supabase
                    .from('event_blasts')
                    .update({
                        status: 'sent',
                        sent_count: 0,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', blastId);
            });

            return { success: true, sent: 0, blastId };
        }

        // Step 2: Send emails
        const sendResult = await step.run('send-blast-emails', async () => {
            const eventUrl = `${APP_URL}/events/${eventId}`;
            let sentCount = 0;
            let failCount = 0;

            // Process in batches of 50
            const batchSize = 50;
            for (let i = 0; i < recipients.length; i += batchSize) {
                const batch = recipients.slice(i, i + batchSize);

                // Send to each recipient individually for proper tracking
                for (const email of batch) {
                    try {
                        if (!RESEND_API_KEY) {
                            console.log(`[Blast] Mock send to: ${email}`);
                            sentCount++;
                            continue;
                        }

                        const response = await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${RESEND_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                from: FROM_EMAIL,
                                to: [email],
                                subject: subject,
                                html: buildBlastEmailHtml({
                                    subject,
                                    message,
                                    senderName,
                                    eventTitle,
                                    eventUrl,
                                }),
                            }),
                        });

                        if (response.ok) {
                            sentCount++;
                        } else {
                            failCount++;
                            const err = await response.json();
                            console.error(`[Blast] Failed to send to ${email}:`, err);
                        }
                    } catch (err) {
                        failCount++;
                        console.error(`[Blast] Error sending to ${email}:`, err);
                    }
                }
            }

            return { sentCount, failCount };
        });

        // Step 3: Update blast status
        await step.run('update-blast-status', async () => {
            await supabase
                .from('event_blasts')
                .update({
                    status: 'sent',
                    sent_count: sendResult.sentCount,
                    failed_count: sendResult.failCount,
                    sent_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', blastId);
        });

        return {
            success: true,
            blastId,
            sent: sendResult.sentCount,
            failed: sendResult.failCount,
        };
    }
);

function buildBlastEmailHtml(params: {
    subject: string;
    message: string;
    senderName: string;
    eventTitle: string;
    eventUrl: string;
}): string {
    const { message, senderName, eventTitle, eventUrl } = params;

    // Convert newlines in message to <br> tags
    const formattedMessage = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

    return `
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
                        <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px;">
                            <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                                Update from ${senderName}
                            </p>
                            <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 22px; font-weight: 600;">
                                ${eventTitle}
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <div style="font-size: 16px; line-height: 1.7; color: #374151;">
                                ${formattedMessage}
                            </div>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 32px 0 0;">
                                        <a href="${eventUrl}" 
                                           style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                                            View Event →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                Sent via Lumma • <a href="${eventUrl}" style="color: #6366f1;">lumma.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}
