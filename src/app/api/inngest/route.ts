import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sendInviteEmail } from "@/inngest/functions/sendInvite";
import { sendEventReminders, send1HourReminders } from "@/inngest/functions/sendReminders";
import { handleInviteCreated, handleEmailWebhook } from "@/inngest/functions/handleInviteCreated";
import { sendBlastEmail } from "@/inngest/functions/sendBlast";
import { sendNewsletter } from "@/inngest/functions/sendNewsletter";
import { indexEvent, indexEventUpdate } from "@/inngest/functions/indexEntity";
import { reindexAll } from "@/inngest/functions/reindex";
import { eventStartJob, eventEndJob, handleManualTransition } from "@/inngest/functions/eventLifecycle";
import { processNoShowsJob, processRefundsJob } from "@/inngest/functions/ticketLifecycle";
import {
    onEventStarted,
    onEventEnded,
    onTicketCheckedIn,
    onTicketForfeited,
    onTicketApproved,
    onPaymentReceived,
} from "@/inngest/functions/event-consumers";
import {
    scheduleEventStart,
    scheduleEventEnd,
    scheduleNoShowProcessing,
} from "@/inngest/functions/temporal-scheduler";
import {
    reconcileEventStates,
    reconcileEscrowStates,
} from "@/inngest/functions/reconciliation";

// Create an API that serves Inngest functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        // Legacy invite sending (kept for backward compatibility)
        sendInviteEmail,
        // New invite lifecycle handling
        handleInviteCreated,
        handleEmailWebhook,
        // Blast emails
        sendBlastEmail,
        sendNewsletter,
        // Reminders
        sendEventReminders,   // 24h reminder (hourly cron)
        send1HourReminders,   // 1h reminder (every 15 min cron)
        // Search Indexing
        indexEvent,
        indexEventUpdate,
        // Maintenance
        reindexAll,
        // Event Lifecycle State Machine (Legacy Cron - kept for redundancy)
        eventStartJob,          // published → live (every 5 min)
        eventEndJob,            // live → ended (every 5 min)
        handleManualTransition, // Manual status changes via event
        // Ticket Lifecycle State Machine
        processNoShowsJob,      // Forfeit no-shows (every 15 min)
        processRefundsJob,      // Process refund requests
        // Domain Event Consumers (Event-Driven Architecture)
        onEventStarted,         // React to EVENT_STARTED
        onEventEnded,           // React to EVENT_ENDED
        onTicketCheckedIn,      // React to TICKET_CHECKED_IN
        onTicketForfeited,      // React to TICKET_FORFEITED
        onTicketApproved,       // React to TICKET_APPROVED
        onPaymentReceived,      // React to PAYMENT_RECEIVED
        // Temporal Scheduler (Exact-Time Transitions)
        scheduleEventStart,     // Schedule event start at exact time
        scheduleEventEnd,       // Schedule event end at exact time
        scheduleNoShowProcessing, // Process no-shows after event ends
        // Temporal Reconciliation (Catch Missed Transitions)
        reconcileEventStates,   // Every 30 min - fix state drift
        reconcileEscrowStates,  // Every hour - verify escrow releases
    ],
});
