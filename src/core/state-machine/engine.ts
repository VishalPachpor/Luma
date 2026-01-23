/**
 * State Machine Engine (V3)
 * 
 * Pure function engine to validate transitions based on definitions.
 */

import {
    EventStateMachine,
    TicketStateMachine,
    EventStatus,
    TicketStatus
} from './definitions';

// ============================================================================
// Types
// ============================================================================

export type StateMachineDefinition = Record<string, Record<string, string>>;

// ============================================================================
// Engine
// ============================================================================

export class StateMachineEngine {

    /**
     * Get the target state for a given action.
     * Returns undefined if transition is invalid.
     */
    transition<S extends string>(
        machine: StateMachineDefinition,
        currentState: S,
        action: string
    ): S | undefined {
        const transitions = machine[currentState];
        if (!transitions) return undefined;

        return transitions[action] as S;
    }

    /**
     * Check if a transition is valid.
     */
    canTransition(
        machine: StateMachineDefinition,
        currentState: string,
        action: string
    ): boolean {
        return !!this.transition(machine, currentState, action);
    }

    /**
     * Get all possible actions from current state.
     */
    getAvailableActions(
        machine: StateMachineDefinition,
        currentState: string
    ): string[] {
        const transitions = machine[currentState];
        return transitions ? Object.keys(transitions) : [];
    }
}

// ============================================================================
// Usage Helpers
// ============================================================================

const engine = new StateMachineEngine();

export function getEventTransition(current: EventStatus, action: string): EventStatus | undefined {
    return engine.transition(EventStateMachine, current, action);
}

export function getTicketTransition(current: TicketStatus, action: string): TicketStatus | undefined {
    return engine.transition(TicketStateMachine, current, action);
}

export const smEngine = engine;
