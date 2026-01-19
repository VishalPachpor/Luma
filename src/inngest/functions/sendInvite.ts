import { inngest } from "@/inngest/client";

// Resend API (you'll need to add RESEND_API_KEY to .env)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const sendInviteEmail = inngest.createFunction(
    { id: "send-invite-email" },
    { event: "app/invite.sent" },
    async ({ event, step }) => {
        const { eventId, eventTitle, recipientEmail, senderName } = event.data;

        await step.run("send-email-via-resend", async () => {
            // Validation
            if (!eventId || !eventTitle || !recipientEmail) {
                throw new Error("Missing required fields");
            }

            // If Resend is not configured, log and return mock success
            if (!RESEND_API_KEY) {
                console.log('Resend not configured. Would send invite to:', recipientEmail);
                console.log('Event:', eventTitle);
                return { success: true, mock: true };
            }

            // Build event URL
            const eventUrl = `${APP_URL}/events/${eventId}`;

            // Send email via Resend
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: FROM_EMAIL,
                    to: [recipientEmail],
                    subject: `${senderName} invited you to ${eventTitle}`,
                    html: `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                            <h1 style="font-size: 24px; color: #1a1a1a; margin-bottom: 20px;">
                                You're invited! 🎉
                            </h1>
                            
                            <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6;">
                                <strong>${senderName}</strong> has invited you to join an event:
                            </p>
                            
                            <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; margin: 24px 0;">
                                <h2 style="font-size: 20px; color: #1a1a1a; margin: 0 0 8px 0;">
                                    ${eventTitle}
                                </h2>
                            </div>
                            
                            <a href="${eventUrl}" style="display: inline-block; background: #4C7DFF; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 16px 0;">
                                View Event & RSVP
                            </a>
                            
                            <p style="font-size: 14px; color: #888; margin-top: 32px;">
                                If you weren't expecting this email, you can safely ignore it.
                            </p>
                        </div>
                    `,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Resend error: ${JSON.stringify(errorData)}`);
            }

            const result = await response.json();
            return { success: true, messageId: result.id };
        });

        return { success: true };
    }
);
