import { inngest } from "@/inngest/client";
import { getServiceSupabase } from "@/lib/supabase";

// Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const sendEventReminders = inngest.createFunction(
    { id: "send-event-reminders" }, // Function ID
    { cron: "0 * * * *" },          // Run hourly
    async ({ step }) => {
        const supabase = getServiceSupabase();

        // 1. Calculate time window (Next 24-25 hours)
        // We look for events starting exactly 24 hours from now (within the next hour block)
        const now = new Date();
        const startWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Now + 24h
        const endWindow = new Date(now.getTime() + 25 * 60 * 60 * 1000);   // Now + 25h

        const startISO = startWindow.toISOString();
        const endISO = endWindow.toISOString();

        console.log(`[Reminders] Checking for events between ${startISO} and ${endISO}`);

        // 2. Find events starting in this window
        const { data: events, error: eventError } = await step.run(
            "fetch-upcoming-events",
            async () => {
                const { data, error } = await supabase
                    .from('events')
                    .select('id, title, date, location')
                    .gte('date', startISO)
                    .lt('date', endISO);

                if (error) throw new Error(error.message);
                return { data, error: null };
            }
        );

        if (eventError || !events || events.length === 0) {
            return { message: "No upcoming events found for this hour." };
        }

        console.log(`[Reminders] Found ${events.length} events starting soon.`);

        // 3. For each event, find attendees and send emails
        const results = [];

        for (const event of events) {
            const { data: attendees } = await step.run(
                `fetch-attendees-${event.id}`,
                async () => {
                    // Join RSVPs with Users to get emails
                    // Note: We blindly select users(email) relying on foreign keys
                    const { data, error } = await supabase
                        .from('rsvps')
                        .select('user_id, status, users!inner(email, display_name)')
                        .eq('event_id', event.id)
                        .eq('status', 'going');

                    if (error) throw new Error(error.message);
                    return { data };
                }
            );

            if (!attendees || attendees.length === 0) continue;

            // Send emails in a batch (or loop)
            // Ideally we'd map this to a separate Inngest event for fan-out
            // But for now, we'll loop sequentially in the step for simplicity in migration
            let sentCount = 0;

            await step.run(`send-emails-${event.id}`, async () => {
                for (const rsvp of attendees) {
                    // Type assertion for joined data
                    const user = rsvp.users as unknown as { email: string, display_name: string };
                    const email = user?.email;
                    const name = user?.display_name || 'Friend';

                    if (!email) continue;
                    if (!RESEND_API_KEY) {
                        console.log(`[Mock Send] Reminder to ${email} for ${event.title}`);
                        sentCount++;
                        continue;
                    }

                    try {
                        await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${RESEND_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                from: FROM_EMAIL,
                                to: [email],
                                subject: `Reminder: ${event.title} is tomorrow! ⏰`,
                                html: `
                                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                        <h2>Ready for tomorrow?</h2>
                                        <p>Hi ${name},</p>
                                        <p>This is a friendly reminder that you have an event coming up in 24 hours.</p>
                                        
                                        <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                            <h3 style="margin-top: 0;">${event.title}</h3>
                                            <p><strong>When:</strong> ${new Date(event.date).toLocaleString()}</p>
                                            <p><strong>Where:</strong> ${event.location || 'Online'}</p>
                                        </div>

                                        <a href="${APP_URL}/events/${event.id}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Event Details</a>
                                    </div>
                                `
                            })
                        });
                        sentCount++;
                    } catch (e) {
                        console.error(`Failed to send reminder to ${email}`, e);
                    }
                }
                return { sent: sentCount };
            });

            results.push({ eventId: event.id, sent: sentCount });
        }

        return { success: true, results };
    }
);

/**
 * 1-Hour Event Reminder
 * Runs every 15 minutes to catch events starting in the next hour
 */
export const send1HourReminders = inngest.createFunction(
    { id: "send-1-hour-reminders" },
    { cron: "*/15 * * * *" }, // Run every 15 minutes for tighter window
    async ({ step }) => {
        const supabase = getServiceSupabase();

        const now = new Date();
        const startWindow = new Date(now.getTime() + 55 * 60 * 1000);  // Now + 55min
        const endWindow = new Date(now.getTime() + 75 * 60 * 1000);    // Now + 75min

        const startISO = startWindow.toISOString();
        const endISO = endWindow.toISOString();

        console.log(`[1H Reminders] Checking for events between ${startISO} and ${endISO}`);

        const { data: events, error: eventError } = await step.run(
            "fetch-1h-events",
            async () => {
                const { data, error } = await supabase
                    .from('events')
                    .select('id, title, date, location')
                    .gte('date', startISO)
                    .lt('date', endISO);

                if (error) throw new Error(error.message);
                return { data, error: null };
            }
        );

        if (eventError || !events || events.length === 0) {
            return { message: "No events starting in ~1 hour." };
        }

        console.log(`[1H Reminders] Found ${events.length} events starting in ~1 hour.`);

        const results = [];

        for (const event of events) {
            const { data: attendees } = await step.run(
                `fetch-1h-attendees-${event.id}`,
                async () => {
                    const { data, error } = await supabase
                        .from('rsvps')
                        .select('user_id, status, users!inner(email, display_name)')
                        .eq('event_id', event.id)
                        .eq('status', 'going');

                    if (error) throw new Error(error.message);
                    return { data };
                }
            );

            if (!attendees || attendees.length === 0) continue;

            let sentCount = 0;

            await step.run(`send-1h-emails-${event.id}`, async () => {
                for (const rsvp of attendees) {
                    const user = rsvp.users as unknown as { email: string, display_name: string };
                    const email = user?.email;
                    const name = user?.display_name || 'Friend';

                    if (!email) continue;
                    if (!RESEND_API_KEY) {
                        console.log(`[Mock Send] 1H Reminder to ${email} for ${event.title}`);
                        sentCount++;
                        continue;
                    }

                    try {
                        await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${RESEND_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                from: FROM_EMAIL,
                                to: [email],
                                subject: `⚡ ${event.title} starts in 1 hour!`,
                                html: `
                                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                        <h2 style="color: #6366f1;">Starting Soon! ⚡</h2>
                                        <p>Hi ${name},</p>
                                        <p><strong>${event.title}</strong> is starting in about 1 hour. Don't miss it!</p>
                                        
                                        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 20px; border-radius: 12px; margin: 20px 0; color: white;">
                                            <h3 style="margin-top: 0; color: white;">${event.title}</h3>
                                            <p style="margin: 8px 0;"><strong>When:</strong> ${new Date(event.date).toLocaleString()}</p>
                                            <p style="margin: 8px 0;"><strong>Where:</strong> ${event.location || 'Online'}</p>
                                        </div>

                                        <a href="${APP_URL}/events/${event.id}" style="display: inline-block; background: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Join Now →</a>
                                    </div>
                                `
                            })
                        });
                        sentCount++;
                    } catch (e) {
                        console.error(`Failed to send 1h reminder to ${email}`, e);
                    }
                }
                return { sent: sentCount };
            });

            results.push({ eventId: event.id, sent: sentCount });
        }

        return { success: true, results };
    }
);
