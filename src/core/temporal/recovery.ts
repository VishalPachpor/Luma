/**
 * Temporal Recovery (V3)
 * 
 * Capability to replay domain events and rebuild state.
 * Used for:
 * 1. Disaster recovery (DB corruption)
 * 2. Fixing state drift (Read Model vs Event Store)
 * 3. Debugging (Time travel)
 */

import { eventStore } from '@/core/domain-events/store';
import { getServiceSupabase } from '@/lib/supabase';
import { EventStates, TicketStates } from '@/core/state-machine/definitions';
import type { DomainEventEnvelope } from '@/core/domain-events/types';

// ============================================================================
// Recovery Engine
// ============================================================================

class TemporalRecovery {

    /**
     * Reconcile a single entity by replaying its event stream.
     * Updates the Read Model (Supabase tables) to match Event Store.
     */
    async reconcileEntity(entityType: 'event' | 'ticket', entityId: string): Promise<{ fixed: boolean; oldState?: string; newState?: string }> {
        const supabase = getServiceSupabase();

        // 1. Fetch all events for this entity
        const stream = await eventStore.getStream(entityType, entityId);

        if (stream.length === 0) {
            return { fixed: false }; // No events, nothing to reconcile
        }

        // 2. Compute expected state from events (Fold)
        const expectedState = this.computeState(entityType, stream);

        // 3. Fetch current state from Read Model
        const { data: current } = await supabase
            .from(entityType === 'event' ? 'events' : 'guests')
            .select('status')
            .eq('id', entityId)
            .single();

        const currentState = current?.status;

        // 4. Compare & Fix
        if (expectedState && currentState !== expectedState) {
            console.warn(`[Recovery] Drift detected for ${entityType}:${entityId}. DB: ${currentState}, Events: ${expectedState}`);

            // Fix Read Model
            await supabase
                .from(entityType === 'event' ? 'events' : 'guests')
                .update({
                    status: expectedState,
                    updated_at: new Date().toISOString(),
                    _recovery_reason: 'temporal_replay'
                })
                .eq('id', entityId);

            return { fixed: true, oldState: currentState, newState: expectedState };
        }

        return { fixed: false };
    }

    /**
     * Compute state by folding events (Redux-like reducer)
     */
    private computeState(entityType: 'event' | 'ticket', stream: DomainEventEnvelope[]): string | null {
        // Sort by version (should be sorted by store, but safety first)
        const sorted = [...stream].sort((a, b) => a.version - b.version);

        if (entityType === 'event') {
            let state: string = EventStates.DRAFT; // Explicit type

            for (const env of sorted) {
                switch (env.event.type) {
                    case 'EVENT_PUBLISHED': state = EventStates.PUBLISHED; break;
                    case 'EVENT_STARTED': state = EventStates.LIVE; break;
                    case 'EVENT_ENDED': state = EventStates.ENDED; break;
                    case 'EVENT_ARCHIVED': state = EventStates.ARCHIVED; break;
                    case 'EVENT_CANCELLED': state = EventStates.CANCELLED; break;
                }
            }
            return state;
        }

        if (entityType === 'ticket') {
            let state: string = TicketStates.PENDING; // Explicit type

            for (const env of sorted) {
                switch (env.event.type) {
                    case 'TICKET_APPROVED': state = TicketStates.APPROVED; break;
                    case 'TICKET_REJECTED': state = TicketStates.REJECTED; break;
                    case 'TICKET_STAKED': state = TicketStates.STAKED; break;
                    case 'TICKET_CHECKED_IN': state = TicketStates.CHECKED_IN; break;
                    case 'TICKET_FORFEITED': state = TicketStates.FORFEITED; break;
                    case 'TICKET_REFUNDED': state = TicketStates.REFUNDED; break;
                }
            }
            return state;
        }

        return null;
    }
}

export const recovery = new TemporalRecovery();
