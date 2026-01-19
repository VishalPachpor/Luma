import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sendInviteEmail } from "@/inngest/functions/sendInvite";
import { sendEventReminders, send1HourReminders } from "@/inngest/functions/sendReminders";

// Create an API that serves Inngest functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        sendInviteEmail,
        sendEventReminders,   // 24h reminder (hourly cron)
        send1HourReminders,   // 1h reminder (every 15 min cron)
    ],
});
