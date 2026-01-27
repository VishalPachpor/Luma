/**
 * Domain Event Consumers
 * 
 * Inngest functions that react to domain events.
 * Multiple consumers can react to the same event (fan-out pattern).
 */

import { inngest } from '@/inngest/client';
import { getServiceSupabase } from '@/lib/supabase';

// ============================================================================
// Event Lifecycle Consumers
// ============================================================================

/**
 * When an event starts, notify all registered attendees
 */
export const onEventStarted = inngest.createFunction(
    { id: 'consumer-event-started-notify' },
    { event: 'app/event_started' },
    async ({ event, step, logger }) => {
        const { eventId } = event.data;

        logger.info(`[Consumer] Event ${eventId} started - sending notifications`);

        // Get all guests for this event
        const supabase = getServiceSupabase();
        const { data: guests } = await supabase
            .from('guests')
            .select('id, user_id, email')
            .eq('event_id', eventId)
            .in('status', ['issued', 'staked', 'approved']);

        if (!guests || guests.length === 0) {
            return { notified: 0 };
        }

        // Send notifications (could fan out to individual jobs)
        // For now, just log
        logger.info(`[Consumer] Would notify ${guests.length} attendees`);

        return { notified: guests.length };
    }
);

/**
 * When an event ends, calculate final stats
 */
export const onEventEnded = inngest.createFunction(
    { id: 'consumer-event-ended-stats' },
    { event: 'app/event_ended' },
    async ({ event, step, logger }) => {
        const { eventId } = event.data;

        logger.info(`[Consumer] Event ${eventId} ended - calculating stats`);

        const supabase = getServiceSupabase();

        // Get final counts
        const { count: totalGuests } = await supabase
            .from('guests')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', eventId);

        const { count: checkedIn } = await supabase
            .from('guests')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .eq('status', 'checked_in');

        // Update event with final stats
        await supabase
            .from('events')
            .update({
                attendee_count: totalGuests || 0,
                checked_in_count: checkedIn || 0,
            })
            .eq('id', eventId);

        logger.info(`[Consumer] Event ${eventId} stats: ${checkedIn}/${totalGuests} checked in`);

        return { totalGuests, checkedIn };
    }
);

// ============================================================================
// Ticket Lifecycle Consumers
// ============================================================================

/**
 * When a ticket is checked in, release escrow if staked
 */
export const onTicketCheckedIn = inngest.createFunction(
    { id: 'consumer-ticket-checkin-escrow' },
    { event: 'app/ticket_checked_in' },
    async ({ event, step, logger }) => {
        const { guestId, eventId } = event.data;

        logger.info(`[Consumer] Ticket ${guestId} checked in - processing escrow`);

        const supabase = getServiceSupabase();

        // Check if this was a staked ticket
        const { data: guest } = await supabase
            .from('guests')
            .select('stake_amount, stake_wallet_address, event_id')
            .eq('id', guestId)
            .single();

        if (guest?.stake_amount && guest?.stake_wallet_address) {
            logger.info(`[Consumer] Releasing stake for ${guestId}: ${guest.stake_amount}`);

            // Call escrow service to release
            const { releaseStakeOnCheckIn } = await import('@/lib/services/escrow.service');
            const releaseResult = await releaseStakeOnCheckIn(
                eventId,
                guestId,
                guest.stake_wallet_address
            );

            if (releaseResult.success) {
                logger.info(`[Consumer] Stake released successfully: ${releaseResult.txHash}`);
            } else {
                logger.error(`[Consumer] Failed to release stake: ${releaseResult.error}`);
            }

            return { 
                processed: true, 
                hadStake: true,
                releaseTxHash: releaseResult.txHash,
                releaseSuccess: releaseResult.success,
            };
        }

        return { processed: true, hadStake: !!guest?.stake_amount };
    }
);

/**
 * When a ticket is forfeited, claim escrow for organizer
 */
export const onTicketForfeited = inngest.createFunction(
    { id: 'consumer-ticket-forfeit-escrow' },
    { event: 'app/ticket_forfeited' },
    async ({ event, step, logger }) => {
        const { guestId, reason } = event.data;

        logger.info(`[Consumer] Ticket ${guestId} forfeited: ${reason}`);

        const supabase = getServiceSupabase();

        // Check if this was a staked ticket
        const { data: guest } = await supabase
            .from('guests')
            .select('stake_amount, stake_wallet_address, event_id')
            .eq('id', guestId)
            .single();

        if (guest?.stake_amount && guest?.stake_wallet_address && guest?.event_id) {
            logger.info(`[Consumer] Claiming forfeit for ${guestId}: ${guest.stake_amount}`);

            // Call escrow service to forfeit
            const { forfeitStakeForNoShow } = await import('@/lib/services/escrow.service');
            const forfeitResult = await forfeitStakeForNoShow(
                guest.event_id,
                guestId,
                guest.stake_wallet_address
            );

            if (forfeitResult.success) {
                logger.info(`[Consumer] Stake forfeited successfully: ${forfeitResult.txHash}`);
            } else {
                logger.error(`[Consumer] Failed to forfeit stake: ${forfeitResult.error}`);
            }

            return { 
                processed: true, 
                hadStake: true,
                forfeitTxHash: forfeitResult.txHash,
                forfeitSuccess: forfeitResult.success,
            };
        }

        return { processed: true, hadStake: !!guest?.stake_amount };
    }
);

/**
 * When a ticket is approved, send confirmation email
 */
export const onTicketApproved = inngest.createFunction(
    { id: 'consumer-ticket-approved-email' },
    { event: 'app/ticket_approved' },
    async ({ event, step, logger }) => {
        const { guestId } = event.data;

        logger.info(`[Consumer] Ticket ${guestId} approved - sending email`);

        // Would send email here
        // await emailService.sendApprovalConfirmation(guestId);

        return { emailSent: true };
    }
);

// ============================================================================
// Payment Consumers
// ============================================================================

/**
 * When payment is received, issue ticket
 */
export const onPaymentReceived = inngest.createFunction(
    { id: 'consumer-payment-issue-ticket' },
    { event: 'app/payment_received' },
    async ({ event, step, logger }) => {
        const { orderId, eventId, userId, amount } = event.data;

        logger.info(`[Consumer] Payment received: ${orderId} - ${amount}`);

        // Find the guest record and transition to issued/staked
        // This would use stateEngine.transition()

        return { processed: true };
    }
);
