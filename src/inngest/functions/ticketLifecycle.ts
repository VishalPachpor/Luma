/**
 * Ticket Lifecycle Inngest Jobs
 * 
 * Automated processing for ticket/guest lifecycle:
 *   - Process no-shows: Forfeit staked tickets after event ends
 */

import { inngest } from '@/inngest/client';
import {
    findGuestsToForfeit,
    batchForfeit,
} from '@/lib/services/ticket-lifecycle.service';

// ============================================================================
// No-Show Processing Job
// ============================================================================

/**
 * Processes no-shows after events end.
 * 
 * Schedule: Every 15 minutes
 * 
 * Logic:
 *   1. Find staked guests whose events have ended (with 1hr grace)
 *   2. Transition them to 'forfeited'
 *   3. Log the results
 * 
 * This job handles the automatic forfeiture of stakes for attendees
 * who did not check in. In a full production system, this would
 * also trigger the escrow contract to release funds.
 */
export const processNoShowsJob = inngest.createFunction(
    {
        id: 'ticket-process-no-shows',
        retries: 3,
    },
    { cron: '*/15 * * * *' }, // Every 15 minutes
    async ({ step, logger }) => {
        // Step 1: Find guests to forfeit
        const guestsToForfeit = await step.run('find-guests-to-forfeit', async () => {
            const guestIds = await findGuestsToForfeit();
            logger.info(`[TicketLifecycle] Found ${guestIds.length} guests to forfeit`);
            return guestIds;
        });

        if (guestsToForfeit.length === 0) {
            return { message: 'No guests to forfeit', count: 0 };
        }

        // Step 2: Batch forfeit
        const result = await step.run('batch-forfeit', async () => {
            return batchForfeit(
                guestsToForfeit,
                'Automatic forfeiture: No check-in after event ended'
            );
        });

        logger.info(
            `[TicketLifecycle] Forfeited ${result.succeeded} guests, ${result.failed} failed`
        );

        if (result.errors.length > 0) {
            logger.warn('[TicketLifecycle] Forfeit errors:', result.errors);
        }

        return {
            message: `Forfeited ${result.succeeded} guests`,
            succeeded: result.succeeded,
            failed: result.failed,
            errors: result.errors,
        };
    }
);

// ============================================================================
// Refund Processing Job (Future - requires escrow contract)
// ============================================================================

/**
 * Processes refund requests.
 * 
 * This is a placeholder for when escrow contract integration is added.
 * Currently, refunds are processed manually via the API.
 */
export const processRefundsJob = inngest.createFunction(
    {
        id: 'ticket-process-refunds',
        retries: 3,
    },
    { event: 'app/ticket.refund.requested' },
    async ({ event, step, logger }) => {
        const { guestId, reason } = event.data as {
            guestId: string;
            reason?: string;
        };

        logger.info(`[TicketLifecycle] Processing refund for guest: ${guestId}`);

        // In production, this would:
        // 1. Call escrow contract to release funds back to attendee
        // 2. Wait for transaction confirmation
        // 3. Update guest status to 'refunded'

        // For now, just log the request
        return {
            message: 'Refund request logged (escrow integration pending)',
            guestId,
            reason,
        };
    }
);
