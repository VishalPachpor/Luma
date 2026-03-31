/**
 * Staking State Machine Tests
 *
 * Tests the state machine logic, transition validation,
 * and command/event payload alignment locally without needing DB.
 */

import { describe, it, expect } from 'vitest';
import { TicketStateMachine, TicketStates } from '../src/core/state-machine/definitions';
import { StateMachineEngine } from '../src/core/state-machine/engine';

const engine = new StateMachineEngine();

describe('Staking Happy Path', () => {
    it('pending → request_approval → pending_approval', () => {
        expect(engine.transition(TicketStateMachine, 'pending', 'request_approval')).toBe('pending_approval');
    });

    it('pending_approval → approve → approved', () => {
        expect(engine.transition(TicketStateMachine, 'pending_approval', 'approve')).toBe('approved');
    });

    it('approved → stake → staked', () => {
        expect(engine.transition(TicketStateMachine, 'approved', 'stake')).toBe('staked');
    });

    it('staked → check_in → checked_in', () => {
        expect(engine.transition(TicketStateMachine, 'staked', 'check_in')).toBe('checked_in');
    });
});

describe('Blocked Transitions', () => {
    it('pending CANNOT go directly to staked', () => {
        expect(engine.transition(TicketStateMachine, 'pending', 'stake')).toBeUndefined();
    });
});

describe('Free Registration Path', () => {
    it('pending → issue → issued', () => {
        expect(engine.transition(TicketStateMachine, 'pending', 'issue')).toBe('issued');
    });

    it('issued → check_in → checked_in', () => {
        expect(engine.transition(TicketStateMachine, 'issued', 'check_in')).toBe('checked_in');
    });
});

describe('Staked Ticket Forfeit (No-Show)', () => {
    it('staked → forfeit → forfeited', () => {
        expect(engine.transition(TicketStateMachine, 'staked', 'forfeit')).toBe('forfeited');
    });
});

describe('Staked Ticket Refund', () => {
    it('staked → refund → refunded', () => {
        expect(engine.transition(TicketStateMachine, 'staked', 'refund')).toBe('refunded');
    });

    it('staked → cancel → refunded', () => {
        expect(engine.transition(TicketStateMachine, 'staked', 'cancel')).toBe('refunded');
    });
});

describe('Terminal States', () => {
    const terminals = ['checked_in', 'scanned', 'rejected', 'forfeited', 'refunded', 'revoked', 'cancelled'] as const;

    for (const state of terminals) {
        it(`${state} has no available actions`, () => {
            const actions = engine.getAvailableActions(TicketStateMachine, state);
            expect(actions).toHaveLength(0);
        });
    }
});

describe('All States Recognized', () => {
    it('all TicketStates present in state machine', () => {
        const stateValues = Object.values(TicketStates);
        const smKeys = Object.keys(TicketStateMachine);

        for (const state of stateValues) {
            expect(smKeys).toContain(state);
        }

        expect(stateValues.length).toBe(smKeys.length);
    });
});

describe('Legacy scan transition', () => {
    it('staked → scan → scanned', () => {
        expect(engine.transition(TicketStateMachine, 'staked', 'scan')).toBe('scanned');
    });

    it('issued → scan → scanned', () => {
        expect(engine.transition(TicketStateMachine, 'issued', 'scan')).toBe('scanned');
    });
});

describe('Revoke transitions', () => {
    it('approved → revoke → revoked', () => {
        expect(engine.transition(TicketStateMachine, 'approved', 'revoke')).toBe('revoked');
    });

    it('issued → revoke → revoked', () => {
        expect(engine.transition(TicketStateMachine, 'issued', 'revoke')).toBe('revoked');
    });
});
