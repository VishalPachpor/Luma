/**
 * Workflow Orchestrator (V3)
 * 
 * The central brain of the system.
 * 1. Accepts Commands
 * 2. Validates State Transitions (via State Machine)
 * 3. Enforces Business Rules (Guards)
 * 4. Persists Domain Events (via Event Store)
 * 5. Schedules Side Effects (via async dispatch)
 */

import { eventStore } from '@/core/domain-events/store';
import { smEngine, getEventTransition, getTicketTransition } from '@/core/state-machine/engine';
import { EventStates, TicketStates } from '@/core/state-machine/definitions';
import { getServiceSupabase } from '@/lib/supabase';
import type { WorkflowCommand } from './commands';
import type { DomainEvent } from '@/core/domain-events/types';

// ============================================================================
// Orchestrator
// ============================================================================

class WorkflowOrchestrator {

    /**
     * Execute a workflow command.
     */
    async execute(command: WorkflowCommand): Promise<{ success: boolean; eventId?: string; error?: string }> {
        try {
            console.log(`[Orchestrator] Executing ${command.name}`, command.payload);

            // 1. Load Aggregate & Validate State
            const { entityType, entityId, currentStatus, entityData } = await this.loadEntityContext(command);

            // 2. Determine Action & Target State
            const action = this.mapCommandToAction(command.name);
            let targetState: string | undefined;

            if (entityType === 'event') {
                targetState = getEventTransition(currentStatus as any, action);
            } else {
                targetState = getTicketTransition(currentStatus as any, action);
            }

            if (!targetState) {
                throw new Error(`Invalid transition: ${currentStatus} -> ${action} for ${entityType}`);
            }

            // 3. Validate Business Rules (Guards)
            await this.validateGuards(command, entityType, entityData, targetState);

            // 4. Create Domain Event
            const event = this.createDomainEvent(command, entityData, targetState);

            // 5. Persist to Event Store (Optimistic Concurrency)
            const envelope = await eventStore.append(event, {
                actor: { type: command.actorType, id: command.actorId },
                correlationId: command.correlationId,
            });

            // 6. Update Read Model (Supabase) - In V3 this ideally happens async via consumer, 
            // but for hybrid V2/V3 we update immediately for UI responsiveness
            await this.updateReadModel(entityType, entityId, targetState, entityData);

            return { success: true, eventId: envelope.id };

        } catch (error: any) {
            console.error(`[Orchestrator] Failed to execute ${command.name}:`, error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // Internal Helpers
    // =========================================================================

    private mapCommandToAction(commandName: string): string {
        // Map command names to state machine actions
        const map: Record<string, string> = {
            'PUBLISH_EVENT': 'publish',
            'START_EVENT': 'start',
            'END_EVENT': 'end',
            'CANCEL_EVENT': 'cancel',
            'APPROVE_TICKET': 'approve',
            'REJECT_TICKET': 'reject',
            'STAKE_TICKET': 'stake',
            'CHECK_IN_TICKET': 'check_in',
            'FORFEIT_TICKET': 'forfeit',
            'REFUND_TICKET': 'refund',
        };
        return map[commandName] || commandName.toLowerCase();
    }

    private async loadEntityContext(command: WorkflowCommand) {
        const supabase = getServiceSupabase();

        if (command.name.includes('_EVENT')) {
            const eventId = (command.payload as any).eventId;
            const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
            if (!data) throw new Error(`Event not found: ${eventId}`);
            return { entityType: 'event', entityId: eventId, currentStatus: data.status, entityData: data };
        }

        if (command.name.includes('_TICKET')) {
            const ticketId = (command.payload as any).ticketId;
            const { data } = await supabase.from('guests').select('*, events(*)').eq('id', ticketId).single();
            if (!data) throw new Error(`Ticket not found: ${ticketId}`);
            return { entityType: 'ticket', entityId: ticketId, currentStatus: data.status, entityData: data };
        }

        throw new Error('Unknown entity type in command');
    }

    private async validateGuards(
        command: WorkflowCommand,
        entityType: string,
        entity: any,
        targetState: string
    ) {
        // Example Temporal Guard
        if (entityType === 'ticket' && targetState === TicketStates.CHECKED_IN) {
            const event = entity.events;
            if (event.status !== EventStates.LIVE) {
                throw new Error(`Cannot check-in: Event is ${event.status}, must be LIVE`);
            }
        }

        // Example Refund Guard
        if (entityType === 'ticket' && targetState === TicketStates.REFUNDED) {
            const event = entity.events;
            if (event.status !== EventStates.PUBLISHED && event.status !== EventStates.CANCELLED) {
                // Allow refunds if event logic permits (simple version)
            }
        }
    }

    private createDomainEvent(command: WorkflowCommand, entity: any, targetState: string): DomainEvent {
        // Map Command to Domain Event
        // This is a simplified mapper. In full implementation, each command has a specific event mapper.

        const payload = command.payload as any;

        switch (command.name) {
            case 'PUBLISH_EVENT':
                return {
                    type: 'EVENT_PUBLISHED',
                    payload: {
                        eventId: payload.eventId,
                        scheduledStartAt: entity.scheduled_start_at,
                        scheduledEndAt: entity.scheduled_end_at
                    }
                };
            case 'START_EVENT':
                return { type: 'EVENT_STARTED', payload: { eventId: payload.eventId } };
            case 'END_EVENT':
                return { type: 'EVENT_ENDED', payload: { eventId: payload.eventId, attendeeCount: 0, checkedInCount: 0 } };

            case 'CHECK_IN_TICKET':
                return {
                    type: 'TICKET_CHECKED_IN',
                    payload: {
                        guestId: payload.ticketId,
                        eventId: entity.event_id,
                        checkedInAt: new Date().toISOString()
                    }
                };

            case 'STAKE_TICKET':
                return {
                    type: 'TICKET_STAKED',
                    payload: {
                        guestId: payload.ticketId,
                        eventId: entity.event_id,
                        amount: payload.amount,
                        txHash: payload.txHash,
                        chain: payload.chain
                    }
                };

            // ... Add cases for all commands
        }

        // Fallback generic event construction (should be avoided in prod)
        if (command.name.includes('_TICKET')) {
            return {
                type: command.name.replace('COMMAND', 'EVENT') as any, // Hacky fallback
                payload: { ...payload, guestId: payload.ticketId, eventId: entity.event_id }
            };
        }

        throw new Error(`No event definition for command ${command.name}`);
    }

    private async updateReadModel(entityType: string, entityId: string, newState: string, entity: any) {
        const supabase = getServiceSupabase();

        if (entityType === 'event') {
            await supabase.from('events').update({ status: newState, updated_at: new Date().toISOString() }).eq('id', entityId);
        } else {
            const updates: any = { status: newState, updated_at: new Date().toISOString() };
            if (newState === 'checked_in') updates.checked_in_at = new Date().toISOString();
            await supabase.from('guests').update(updates).eq('id', entityId);
        }
    }
}

export const orchestrator = new WorkflowOrchestrator();
