import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sendInviteEmail } from "@/inngest/functions/sendInvite";
import { sendEventReminders } from "@/inngest/functions/sendReminders";

// Create an API that serves Zero Inngest functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        sendInviteEmail,
        sendEventReminders // Phase 6: Automated Reminders
    ],
});
