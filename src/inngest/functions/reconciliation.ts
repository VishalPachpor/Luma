import { inngest } from '@/inngest/client';
import { getServiceSupabase } from '@/lib/supabase';
import { stateEngine } from '@/lib/orchestrator/state-engine'; // Keep for legacy trigger logic
import { recovery } from '@/core/temporal/recovery';

// ============================================================================
// Reconciliation Job (Every 30 min)
// ============================================================================

export const reconcileEventStates = inngest.createFunction(
    {
        id: 'reconcile-event-states',
        retries: 2,
    },
    { cron: '*/30 * * * *' }, // Every 30 minutes
    async ({ logger }) => {
        const supabase = getServiceSupabase();
        const now = new Date();
        const stats = {
            startedEvents: 0,
            endedEvents: 0,
            forfeitedTickets: 0,
            driftFixed: 0,
            errors: 0,
        };

        logger.info('Starting temporal reconciliation (V3)');

        // =====================================================================
        // 1. Time-Based Triggers (Legacy but reliable wrapper)
        // =====================================================================

        const { data: shouldBeLive } = await supabase
            .from('events')
            .select('id, title, scheduled_start_at')
            .eq('status', 'published')
            .lte('scheduled_start_at', now.toISOString());

        for (const e of shouldBeLive || []) {
            // Trigger start via state engine (which calls Orchestrator)
            const res = await stateEngine.transition('event', e.id, 'live', {
                triggeredBy: 'cron',
                reason: 'reconciliation'
            });
            if (res.success) {
                stats.startedEvents++;
            } else {
                logger.error(`Failed to start event ${e.id}: ${res.error}`);
                stats.errors++;
            }
        }

        const { data: shouldBeEnded } = await supabase
            .from('events')
            .select('id, title, scheduled_end_at')
            .eq('status', 'live')
            .lte('scheduled_end_at', now.toISOString());

        for (const e of shouldBeEnded || []) {
            const res = await stateEngine.transition('event', e.id, 'ended', {
                triggeredBy: 'cron',
                reason: 'reconciliation'
            });
            if (res.success) {
                stats.endedEvents++;
            } else {
                logger.error(`Failed to end event ${e.id}: ${res.error}`);
                stats.errors++;
            }
        }

        // =====================================================================
        // 2. V3: Drift Detection & Replay Recovery (The new Temporal Authority)
        // =====================================================================

        // Find events updated recently to check for drift
        const { data: recentEvents } = await supabase
            .from('events')
            .select('id')
            .order('updated_at', { ascending: false })
            .limit(20);

        for (const e of recentEvents || []) {
            const result = await recovery.reconcileEntity('event', e.id);
            if (result.fixed) {
                logger.warn(`Fixed drift for event ${e.id}: ${result.oldState} -> ${result.newState}`);
                stats.driftFixed++;
            }
        }

        // =====================================================================
        // 3. Find staked tickets for ended events (no-shows)
        // =====================================================================
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        const { data: noShowTickets } = await supabase
            .from('guests')
            .select(`
                id, event_id,
                events!inner(id, status, scheduled_end_at)
            `)
            .eq('status', 'staked')
            .eq('events.status', 'ended')
            .lte('events.scheduled_end_at', oneHourAgo.toISOString());

        for (const ticket of noShowTickets || []) {
            const res = await stateEngine.transition('ticket', ticket.id, 'forfeited', {
                triggeredBy: 'cron',
                reason: 'No-show'
            });
            if (res.success) {
                stats.forfeitedTickets++;
            } else {
                stats.errors++;
            }
        }

        logger.info('Temporal reconciliation complete', stats);

        return { ...stats, timestamp: now.toISOString() };
    }
);

// ============================================================================
// Escrow Reconciliation (Every 1 hour)
// ============================================================================

export const reconcileEscrowStates = inngest.createFunction(
    {
        id: 'reconcile-escrow-states',
        retries: 1,
    },
    { cron: '0 * * * *' }, // Every hour
    async ({ logger }) => {
        const supabase = getServiceSupabase();
        const stats = {
            verified: 0,
            discrepancies: 0,
        };

        // Check for tickets checked in but not released
        const { data: unreleased } = await supabase
            .from('guests')
            .select('id')
            .eq('status', 'checked_in')
            .eq('escrow_released', false)
            .limit(100);

        if (unreleased) {
            stats.discrepancies = unreleased.length;
            // TODO: Auto-release logic here
        }

        return stats;
    }
);
