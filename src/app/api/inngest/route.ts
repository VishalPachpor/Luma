import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sendInviteEmail } from "@/inngest/functions/sendInvite";
import { sendEventReminders, send1HourReminders } from "@/inngest/functions/sendReminders";
import { handleInviteCreated, handleEmailWebhook } from "@/inngest/functions/handleInviteCreated";

// Create an API that serves Inngest functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        // Legacy invite sending (kept for backward compatibility)
        sendInviteEmail,
        // New invite lifecycle handling
        handleInviteCreated,
        handleEmailWebhook,
        // Reminders
        sendEventReminders,   // 24h reminder (hourly cron)
        send1HourReminders,   // 1h reminder (every 15 min cron)
    ],
});

