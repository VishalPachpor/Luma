/**
 * Temporal Scheduler
 * 
 * Inngest functions for exact-time state transitions.
 * Replaces cron polling with scheduled events using sleepUntil.
 */

import { inngest } from '@/inngest/client';
import { stateEngine } from '@/lib/orchestrator/state-engine';
import { getServiceSupabase } from '@/lib/supabase';

// ============================================================================
// Scheduled Event Start
// ============================================================================

/**
 * When an event is published, schedule its automatic start at the exact time.
 * This replaces the 5-minute cron polling with exact scheduling.
 */
export const scheduleEventStart = inngest.createFunction(
    {
        id: 'temporal-schedule-event-start',
        retries: 3,
    },
    { event: 'app/event_published' },
    async ({ event, step, logger }) => {
        const { eventId, scheduledStartAt } = event.data;

        if (!scheduledStartAt) {
            logger.info(`Event ${eventId} published without scheduled start time`);
            return { skipped: true, reason: 'No scheduled start time' };
        }

        const startTime = new Date(scheduledStartAt);
        const now = new Date();

        // If start time is in the past, transition immediately
        if (startTime <= now) {
            logger.info(`Event ${eventId} start time already passed, transitioning now`);
            const result = await stateEngine.transition('event', eventId, 'live', {
                triggeredBy: 'system',
                reason: 'Scheduled start time reached (catch-up)',
            });
            return { transitionedImmediately: true, result };
        }

        // Wait until exact start time
        logger.info(`Event ${eventId} scheduled to go live at ${scheduledStartAt}`);
        await step.sleepUntil('wait-for-start-time', startTime);

        // Verify event is still in published state before transitioning
        const currentState = await stateEngine.getCurrentState('event', eventId);
        if (currentState !== 'published') {
            logger.info(`Event ${eventId} is no longer published (${currentState}), skipping`);
            return { skipped: true, reason: `State is ${currentState}` };
        }

        // Transition to live
        const result = await stateEngine.transition('event', eventId, 'live', {
            triggeredBy: 'system',
            reason: 'Scheduled start time reached',
        });

        if (result.success) {
            logger.info(`Event ${eventId} transitioned to live at scheduled time`);

            // Schedule the end transition
            await inngest.send({
                name: 'app/schedule_event_end',
                data: { eventId },
            });
        }

        return { success: result.success, eventId };
    }
);

// ============================================================================
// Scheduled Event End
// ============================================================================

/**
 * Schedule automatic end when event goes live.
 */
export const scheduleEventEnd = inngest.createFunction(
    {
        id: 'temporal-schedule-event-end',
        retries: 3,
    },
    { event: 'app/schedule_event_end' },
    async ({ event, step, logger }) => {
        const { eventId } = event.data;
        const supabase = getServiceSupabase();

        // Get scheduled end time
        const { data: eventData } = await supabase
            .from('events')
            .select('scheduled_end_at, status')
            .eq('id', eventId)
            .single();

        if (!eventData?.scheduled_end_at) {
            logger.info(`Event ${eventId} has no scheduled end time`);
            return { skipped: true, reason: 'No scheduled end time' };
        }

        const endTime = new Date(eventData.scheduled_end_at);
        const now = new Date();

        // If end time is in the past, transition immediately
        if (endTime <= now) {
            logger.info(`Event ${eventId} end time already passed, transitioning now`);
            const result = await stateEngine.transition('event', eventId, 'ended', {
                triggeredBy: 'system',
                reason: 'Scheduled end time reached (catch-up)',
            });
            return { transitionedImmediately: true, result };
        }

        // Wait until exact end time
        logger.info(`Event ${eventId} scheduled to end at ${eventData.scheduled_end_at}`);
        await step.sleepUntil('wait-for-end-time', endTime);

        // Verify event is still live before transitioning
        const currentState = await stateEngine.getCurrentState('event', eventId);
        if (currentState !== 'live') {
            logger.info(`Event ${eventId} is no longer live (${currentState}), skipping`);
            return { skipped: true, reason: `State is ${currentState}` };
        }

        // Transition to ended
        const result = await stateEngine.transition('event', eventId, 'ended', {
            triggeredBy: 'system',
            reason: 'Scheduled end time reached',
        });

        logger.info(`Event ${eventId} transitioned to ended`);

        return { success: result.success, eventId };
    }
);

// ============================================================================
// No-Show Processing (Temporal)
// ============================================================================

/**
 * Schedule no-show processing after event ends.
 * Runs 30 minutes after event end time.
 */
export const scheduleNoShowProcessing = inngest.createFunction(
    {
        id: 'temporal-schedule-no-shows',
        retries: 2,
    },
    { event: 'app/event_ended' },
    async ({ event, step, logger }) => {
        const { eventId } = event.data;
        const supabase = getServiceSupabase();

        // Wait 30 minutes after event end for grace period
        const gracePeriod = 30 * 60 * 1000; // 30 minutes
        await step.sleep('grace-period', gracePeriod);

        logger.info(`Processing no-shows for event ${eventId}`);

        // Find all staked tickets that didn't check in
        const { data: noShows } = await supabase
            .from('guests')
            .select('id, stake_amount')
            .eq('event_id', eventId)
            .eq('status', 'staked');

        if (!noShows || noShows.length === 0) {
            logger.info(`No staked no-shows for event ${eventId}`);
            return { processed: 0 };
        }

        // Forfeit each no-show
        let processed = 0;
        for (const guest of noShows) {
            const result = await stateEngine.transition('ticket', guest.id, 'forfeited', {
                triggeredBy: 'system',
                reason: 'No-show after grace period',
            });

            if (result.success) {
                processed++;
            }
        }

        logger.info(`Forfeited ${processed}/${noShows.length} no-shows for event ${eventId}`);

        return { processed, total: noShows.length, eventId };
    }
);
