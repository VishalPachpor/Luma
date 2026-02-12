/**
 * Inngest Function: Send Calendar Newsletter
 * 
 * Triggered when a newsletter is created.
 * Sends bulk email to calendar subscribers via Resend.
 */

import { inngest } from '@/inngest/client';
import { getServiceSupabase } from '@/lib/supabase';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface NewsletterEvent {
    data: {
        newsletterId: string;
        calendarId: string;
        calendarName: string;
        subject: string;
        message: string;
        senderName: string;
    };
}

export const sendNewsletter = inngest.createFunction(
    {
        id: 'send-calendar-newsletter',
        retries: 2,
        concurrency: { limit: 5 },
    },
    { event: 'app/newsletter.created' },
    async ({ event, step }) => {
        const {
            newsletterId,
            calendarId,
            calendarName,
            subject,
            message,
            senderName,
        } = event.data as NewsletterEvent['data'];

        const supabase = getServiceSupabase();

        // Step 1: Get subscriber emails
        const subscribers = await step.run('get-subscribers', async () => {
            const { data: subs, error } = await supabase
                .from('calendar_subscribers')
                .select('user_id')
                .eq('calendar_id', calendarId);

            if (error) throw new Error(`Failed to fetch subscribers: ${error.message}`);

            const emails: string[] = [];
            for (const sub of (subs || [])) {
                const { data: { user } } = await supabase.auth.admin.getUserById(sub.user_id);
                if (user?.email) {
                    emails.push(user.email);
                }
            }

            return emails;
        });

        if (!subscribers || subscribers.length === 0) {
            await step.run('mark-no-subscribers', async () => {
                await supabase
                    .from('calendar_newsletters')
                    .update({ status: 'sent', sent_count: 0, updated_at: new Date().toISOString() })
                    .eq('id', newsletterId);
            });
            return { success: true, sent: 0, newsletterId };
        }

        // Step 2: Send emails
        const sendResult = await step.run('send-newsletter-emails', async () => {
            const calendarUrl = `${APP_URL}/calendar/${calendarId}`;
            let sentCount = 0;
            let failCount = 0;

            const formattedMessage = message
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>');

            for (const email of subscribers) {
                try {
                    if (!RESEND_API_KEY) {
                        console.log(`[Newsletter] Mock send to: ${email}`);
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
                            subject,
                            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;">
<p style="margin:0;color:rgba(255,255,255,0.8);font-size:14px;text-transform:uppercase;letter-spacing:1px;">Newsletter</p>
<h1 style="margin:8px 0 0;color:#fff;font-size:22px;">${calendarName}</h1>
</td></tr>
<tr><td style="padding:40px;">
<div style="font-size:16px;line-height:1.7;color:#374151;">${formattedMessage}</div>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 0 0;">
<a href="${calendarUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:600;font-size:15px;">View Calendar →</a>
</td></tr></table>
</td></tr>
<tr><td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Sent via Lumma</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
                        }),
                    });

                    if (response.ok) sentCount++;
                    else { failCount++; console.error(`[Newsletter] Failed:`, await response.json()); }
                } catch { failCount++; }
            }

            return { sentCount, failCount };
        });

        // Step 3: Update status
        await step.run('update-newsletter-status', async () => {
            await supabase
                .from('calendar_newsletters')
                .update({
                    status: 'sent',
                    sent_count: sendResult.sentCount,
                    failed_count: sendResult.failCount,
                    sent_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', newsletterId);
        });

        return { success: true, newsletterId, sent: sendResult.sentCount, failed: sendResult.failCount };
    }
);
