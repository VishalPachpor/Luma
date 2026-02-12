/**
 * Staking Integration Test Script
 * 
 * Tests the state machine logic, transition validation,
 * and command/event payload alignment locally without needing DB.
 */

// Inline import of the V3 state machine definitions
import { TicketStateMachine, TicketStates } from '../src/core/state-machine/definitions';
import { StateMachineEngine } from '../src/core/state-machine/engine';

const engine = new StateMachineEngine();
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
    }
}

// ============================================================================
// Test 1: Staking Flow — Happy Path
// ============================================================================

console.log('\n📋 Test 1: Staking Happy Path (pending → approved → staked → checked_in)');

{
    // pending → request_approval → pending_approval
    const s1 = engine.transition(TicketStateMachine, 'pending', 'request_approval');
    assert(s1 === 'pending_approval', `pending + request_approval → pending_approval (got: ${s1})`);

    // pending_approval → approve → approved
    const s2 = engine.transition(TicketStateMachine, 'pending_approval', 'approve');
    assert(s2 === 'approved', `pending_approval + approve → approved (got: ${s2})`);

    // approved → stake → staked
    const s3 = engine.transition(TicketStateMachine, 'approved', 'stake');
    assert(s3 === 'staked', `approved + stake → staked (got: ${s3})`);

    // staked → check_in → checked_in
    const s4 = engine.transition(TicketStateMachine, 'staked', 'check_in');
    assert(s4 === 'checked_in', `staked + check_in → checked_in (got: ${s4})`);
}

// ============================================================================
// Test 2: Staking — No Direct pending → staked (Fix 2)
// ============================================================================

console.log('\n📋 Test 2: Blocked Transition (pending CANNOT go directly to staked)');

{
    const s = engine.transition(TicketStateMachine, 'pending', 'stake');
    assert(s === undefined, `pending + stake → undefined (blocked) (got: ${s})`);
}

// ============================================================================
// Test 3: Free Registration Path (pending → issued → checked_in)
// ============================================================================

console.log('\n📋 Test 3: Free Registration Path (pending → issued → checked_in)');

{
    const s1 = engine.transition(TicketStateMachine, 'pending', 'issue');
    assert(s1 === 'issued', `pending + issue → issued (got: ${s1})`);

    const s2 = engine.transition(TicketStateMachine, 'issued', 'check_in');
    assert(s2 === 'checked_in', `issued + check_in → checked_in (got: ${s2})`);
}

// ============================================================================
// Test 4: Staked Ticket Forfeit (No-Show)
// ============================================================================

console.log('\n📋 Test 4: Staked Ticket Forfeit (staked → forfeited)');

{
    const s = engine.transition(TicketStateMachine, 'staked', 'forfeit');
    assert(s === 'forfeited', `staked + forfeit → forfeited (got: ${s})`);
}

// ============================================================================
// Test 5: Staked Ticket Refund
// ============================================================================

console.log('\n📋 Test 5: Staked Ticket Refund (staked → refunded)');

{
    const s1 = engine.transition(TicketStateMachine, 'staked', 'refund');
    assert(s1 === 'refunded', `staked + refund → refunded (got: ${s1})`);

    // Cancel also leads to refund for staked tickets
    const s2 = engine.transition(TicketStateMachine, 'staked', 'cancel');
    assert(s2 === 'refunded', `staked + cancel → refunded (got: ${s2})`);
}

// ============================================================================
// Test 6: Terminal States Cannot Transition
// ============================================================================

console.log('\n📋 Test 6: Terminal States (no transitions allowed)');

{
    const terminals = ['checked_in', 'scanned', 'rejected', 'forfeited', 'refunded', 'revoked', 'cancelled'] as const;
    for (const state of terminals) {
        const actions = engine.getAvailableActions(TicketStateMachine, state);
        assert(actions.length === 0, `${state} has no available actions (got: [${actions}])`);
    }
}

// ============================================================================
// Test 7: All States Recognized
// ============================================================================

console.log('\n📋 Test 7: All TicketStates present in state machine');

{
    const stateValues = Object.values(TicketStates);
    const smKeys = Object.keys(TicketStateMachine);

    for (const state of stateValues) {
        assert(smKeys.includes(state), `TicketStateMachine has entry for '${state}'`);
    }

    assert(stateValues.length === smKeys.length, `State count matches: ${stateValues.length} states, ${smKeys.length} SM entries`);
}

// ============================================================================
// Test 8: Legacy scan transition (backward compatibility)
// ============================================================================

console.log('\n📋 Test 8: Legacy scan transition');

{
    // staked → scan (legacy checkin)
    const s1 = engine.transition(TicketStateMachine, 'staked', 'scan');
    assert(s1 === 'scanned', `staked + scan → scanned (legacy) (got: ${s1})`);

    // issued → scan (legacy checkin)
    const s2 = engine.transition(TicketStateMachine, 'issued', 'scan');
    assert(s2 === 'scanned', `issued + scan → scanned (legacy) (got: ${s2})`);
}

// ============================================================================
// Test 9: Revoke transitions
// ============================================================================

console.log('\n📋 Test 9: Revoke transitions');

{
    const s1 = engine.transition(TicketStateMachine, 'approved', 'revoke');
    assert(s1 === 'revoked', `approved + revoke → revoked (got: ${s1})`);

    const s2 = engine.transition(TicketStateMachine, 'issued', 'revoke');
    assert(s2 === 'revoked', `issued + revoke → revoked (got: ${s2})`);
}

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('='.repeat(50));

if (failed > 0) {
    process.exit(1);
} else {
    console.log('\n🎉 All state machine integration tests passed!\n');
    process.exit(0);
}
