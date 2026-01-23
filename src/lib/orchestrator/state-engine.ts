/**
 * State Orchestrator (V2/V3 Bridge)
 * 
 * Provides backward compatibility for the legacy StateEngine via the V3 WorkflowOrchestrator.
 * All state transitions are now routed through the deterministic V3 Orchestrator.
 */

import { orchestrator } from '@/core/workflow/orchestrator';
import type { WorkflowCommand } from '@/core/workflow/commands';
import type { GuestStatus } from '@/types/commerce';

// ============================================================================
// Types
// ============================================================================

export type EntityType = 'event' | 'ticket';
export type EventLifecycleStatus = 'draft' | 'published' | 'live' | 'ended' | 'archived';

export interface TransitionContext {
    triggeredBy: 'user' | 'system' | 'cron' | 'webhook';
    actorId?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
}

export interface TransitionResult {
    success: boolean;
    previousState: string;
    newState: string;
    eventId?: string;
    error?: string;
}

// ============================================================================
// State Engine (Bridge Pattern)
// ============================================================================

class StateEngine {
    /**
     * Execute a state transition by delegating to the V3 Workflow Orchestrator.
     */
    async transition(
        entity: EntityType,
        entityId: string,
        targetState: string,
        context: TransitionContext
    ): Promise<TransitionResult> {

        // Map legacy transition request to V3 Command
        const command = this.mapTransitionToCommand(entity, entityId, targetState, context);

        if (!command) {
            return {
                success: false,
                previousState: 'unknown',
                newState: targetState,
                error: `No V3 command mapping for ${entity}:${targetState} (Legacy transition failed)`
            };
        }

        // Execute via V3 Orchestrator
        const result = await orchestrator.execute(command);

        if (!result.success) {
            return {
                success: false,
                previousState: 'unknown', // Orchestrator handles state validation now
                newState: targetState,
                error: result.error
            };
        }

        return {
            success: true,
            previousState: 'unknown',
            newState: targetState,
            eventId: result.eventId
        };
    }

    /**
     * Map legacy transitions to V3 Commands
     */
    private mapTransitionToCommand(
        entity: EntityType,
        entityId: string,
        targetState: string,
        context: TransitionContext
    ): WorkflowCommand | null {
        const base = {
            actorId: context.actorId || 'system',
            actorType: (context.triggeredBy === 'cron' ? 'cron' :
                context.triggeredBy === 'system' ? 'system' : 'user') as any,
            correlationId: (context.metadata?.correlationId as string) || undefined,
        };

        if (entity === 'event') {
            switch (targetState) {
                case 'published':
                    return { ...base, name: 'PUBLISH_EVENT', payload: { eventId: entityId } };
                case 'live':
                    return { ...base, name: 'START_EVENT', payload: { eventId: entityId } };
                case 'ended':
                    return { ...base, name: 'END_EVENT', payload: { eventId: entityId } };
                case 'cancelled':
                    return { ...base, name: 'CANCEL_EVENT', payload: { eventId: entityId, reason: context.reason || 'Manual cancel' } };
            }
        }

        if (entity === 'ticket') {
            switch (targetState) {
                case 'approved':
                    return { ...base, name: 'APPROVE_TICKET', payload: { ticketId: entityId } };
                case 'rejected':
                    return { ...base, name: 'REJECT_TICKET', payload: { ticketId: entityId, reason: context.reason } };
                case 'checked_in':
                    return { ...base, name: 'CHECK_IN_TICKET', payload: { ticketId: entityId } };
                case 'forfeited':
                    return { ...base, name: 'FORFEIT_TICKET', payload: { ticketId: entityId, reason: context.reason } };
                case 'refunded':
                    return { ...base, name: 'REFUND_TICKET', payload: { ticketId: entityId } };
                // 'staked' is typically handled by blockchain event listener calling STAKE_TICKET directly, 
                // but for completeness in legacy transition calls:
                case 'staked':
                    // This one requires more payload data (amount, txHash) usually not present in legacy simple transition.
                    // It might fail validation in orchestrator if payload incomplete.
                    return {
                        ...base,
                        name: 'STAKE_TICKET',
                        payload: {
                            ticketId: entityId,
                            amount: 0, // Legacy transition didn't pass amount
                            txHash: 'legacy-transition',
                            chain: 'ethereum'
                        }
                    };
            }
        }

        return null;
    }

    /**
     * Get current state - Delegated to Orchestrator or Helper
     * (We can keep legacy read helpers here or refactor)
     */
    async getCurrentState(entity: EntityType, entityId: string): Promise<string | null> {
        // To avoid import cycles or complexity, we can keep the simple read logic here 
        // OR import the supabase helper. For now, let's just use the orchestrator helper methodology
        // but since orchestrator.getCurrentState isn't public, we'll re-implement simple read.
        // Actually, let's just return null and let the caller handle it or use the Service directly.
        // But existing code uses this. Let's keep the read implementation.

        const { getServiceSupabase } = require('@/lib/supabase'); // Dynamic require to avoid circular deps if any
        const supabase = getServiceSupabase();

        const table = entity === 'event' ? 'events' : 'guests';
        const { data } = await supabase.from(table).select('status').eq('id', entityId).single();
        return data?.status || null;
    }
}

// Export singleton
export const stateEngine = new StateEngine();

// Export class for testing
export { StateEngine };


