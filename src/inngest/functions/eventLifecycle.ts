/**
 * Event Lifecycle Inngest Jobs
 * 
 * Automated state transitions for events:
 *   - event.start: Transitions published → live at event start time
 *   - event.end: Transitions live → ended at event end time
 * 
 * These run on a cron schedule to automatically manage event lifecycle
 * without manual intervention.
 */

import { inngest } from '@/inngest/client';
import {
    findEventsToStart,
    findEventsToEnd,
    batchTransition,
} from '@/lib/services/event-lifecycle.service';

// ============================================================================
// Event Start Job
// ============================================================================

/**
 * Transitions events from 'published' to 'live' when their start time passes.
 * 
 * Schedule: Every 5 minutes
 * 
 * This allows events to show as "Live" automatically when they begin,
 * enabling features like:
 *   - "Happening Now" badges
 *   - Check-in availability
 *   - No new RSVPs during live event (optional)
 */
export const eventStartJob = inngest.createFunction(
    {
        id: 'event-lifecycle-start',
        retries: 3,
    },
    { cron: '*/5 * * * *' }, // Every 5 minutes
    async ({ step, logger }) => {
        // Step 1: Find events that should be live
        const eventsToStart = await step.run('find-events-to-start', async () => {
            const eventIds = await findEventsToStart();
            logger.info(`[EventLifecycle] Found ${eventIds.length} events to start`);
            return eventIds;
        });

        if (eventsToStart.length === 0) {
            return { message: 'No events to start', count: 0 };
        }

        // Step 2: Batch transition to 'live'
        const result = await step.run('transition-to-live', async () => {
            return batchTransition(
                eventsToStart,
                'live',
                'Automatic transition: Event start time reached'
            );
        });

        logger.info(
            `[EventLifecycle] Started ${result.succeeded} events, ${result.failed} failed`
        );

        if (result.errors.length > 0) {
            logger.warn('[EventLifecycle] Start errors:', result.errors);
        }

        return {
            message: `Started ${result.succeeded} events`,
            succeeded: result.succeeded,
            failed: result.failed,
            errors: result.errors,
        };
    }
);

// ============================================================================
// Event End Job
// ============================================================================

/**
 * Transitions events from 'live' to 'ended' when their end time passes.
 * 
 * Schedule: Every 5 minutes
 * 
 * This allows:
 *   - No more check-ins after event ends
 *   - Post-event analytics to begin
 *   - Refund/no-show processing to start
 */
export const eventEndJob = inngest.createFunction(
    {
        id: 'event-lifecycle-end',
        retries: 3,
    },
    { cron: '*/5 * * * *' }, // Every 5 minutes
    async ({ step, logger }) => {
        // Step 1: Find events that should be ended
        const eventsToEnd = await step.run('find-events-to-end', async () => {
            const eventIds = await findEventsToEnd();
            logger.info(`[EventLifecycle] Found ${eventIds.length} events to end`);
            return eventIds;
        });

        if (eventsToEnd.length === 0) {
            return { message: 'No events to end', count: 0 };
        }

        // Step 2: Batch transition to 'ended'
        const result = await step.run('transition-to-ended', async () => {
            return batchTransition(
                eventsToEnd,
                'ended',
                'Automatic transition: Event end time reached'
            );
        });

        logger.info(
            `[EventLifecycle] Ended ${result.succeeded} events, ${result.failed} failed`
        );

        if (result.errors.length > 0) {
            logger.warn('[EventLifecycle] End errors:', result.errors);
        }

        return {
            message: `Ended ${result.succeeded} events`,
            succeeded: result.succeeded,
            failed: result.failed,
            errors: result.errors,
        };
    }
);

// ============================================================================
// Manual Transition Event Handler
// ============================================================================

/**
 * Handles manual status transitions triggered by user actions.
 * 
 * This is not a cron job but an event-driven function that can be
 * triggered when organizers manually change event status.
 */
export const handleManualTransition = inngest.createFunction(
    {
        id: 'event-lifecycle-manual',
        retries: 2,
    },
    { event: 'app/event.status.change' },
    async ({ event, step, logger }) => {
        const { eventId, targetStatus, userId, reason } = event.data as {
            eventId: string;
            targetStatus: 'published' | 'draft' | 'archived';
            userId: string;
            reason?: string;
        };

        const { transitionEventStatus } = await import('@/lib/services/event-lifecycle.service');

        const result = await step.run('execute-transition', async () => {
            return transitionEventStatus({
                eventId,
                targetStatus,
                triggeredBy: `user:${userId}`,
                reason: reason || 'Manual status change by organizer',
            });
        });

        logger.info(`[EventLifecycle] Manual transition: ${result.previousStatus} → ${result.newStatus}`);

        return {
            success: result.success,
            previousStatus: result.previousStatus,
            newStatus: result.newStatus,
        };
    }
);
