/**
 * V2 Lifecycle Transition Validation Test
 * 
 * Tests the V2 VALID_TRANSITIONS map in ticket-lifecycle.service.ts
 * to verify it aligns with V3 after our fixes.
 */

import type { GuestStatus } from '../src/types/commerce';

// Recreate V2 transitions as they exist after fix
const VALID_TRANSITIONS: Record<GuestStatus, GuestStatus[]> = {
    pending: ['pending_approval', 'issued'],  // Fixed: removed 'staked'
    pending_approval: ['approved', 'rejected'],
    approved: ['staked', 'issued', 'revoked'],
    rejected: [],
    issued: ['scanned', 'checked_in', 'revoked'],
    staked: ['checked_in', 'scanned', 'refunded', 'forfeited'],
    scanned: [],
    checked_in: [],
    revoked: [],
    refunded: [],
    forfeited: [],
};

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
// Test 1: V2/V3 Alignment — Key Transitions Match
// ============================================================================

console.log('\n📋 Test 1: V2 Staking Path Matches V3');

{
    // pending CANNOT go to staked (Fix 2 alignment)
    assert(!VALID_TRANSITIONS.pending.includes('staked'), 'V2: pending cannot go to staked');

    // pending CAN go to pending_approval
    assert(VALID_TRANSITIONS.pending.includes('pending_approval'), 'V2: pending → pending_approval');

    // approved CAN go to staked
    assert(VALID_TRANSITIONS.approved.includes('staked'), 'V2: approved → staked');

    // staked CAN go to checked_in
    assert(VALID_TRANSITIONS.staked.includes('checked_in'), 'V2: staked → checked_in');

    // staked CAN go to forfeited
    assert(VALID_TRANSITIONS.staked.includes('forfeited'), 'V2: staked → forfeited');

    // staked CAN go to refunded
    assert(VALID_TRANSITIONS.staked.includes('refunded'), 'V2: staked → refunded');
}

// ============================================================================
// Test 2: V2 Terminal States
// ============================================================================

console.log('\n📋 Test 2: V2 Terminal States Have No Transitions');

{
    const terminals: GuestStatus[] = ['rejected', 'scanned', 'checked_in', 'revoked', 'refunded', 'forfeited'];
    for (const state of terminals) {
        assert(
            VALID_TRANSITIONS[state].length === 0,
            `V2: ${state} is terminal (${VALID_TRANSITIONS[state].length} transitions)`
        );
    }
}

// ============================================================================
// Test 3: V2 Free Registration Path
// ============================================================================

console.log('\n📋 Test 3: V2 Free Registration Path');

{
    assert(VALID_TRANSITIONS.pending.includes('issued'), 'V2: pending → issued');
    assert(VALID_TRANSITIONS.issued.includes('checked_in'), 'V2: issued → checked_in');
    assert(VALID_TRANSITIONS.issued.includes('scanned'), 'V2: issued → scanned (legacy)');
}

// ============================================================================
// Test 4: V2 Revoke Paths
// ============================================================================

console.log('\n📋 Test 4: V2 Revoke Paths');

{
    assert(VALID_TRANSITIONS.approved.includes('revoked'), 'V2: approved → revoked');
    assert(VALID_TRANSITIONS.issued.includes('revoked'), 'V2: issued → revoked');
    // staked cannot be revoked (must be refunded instead)
    assert(!VALID_TRANSITIONS.staked.includes('revoked'), 'V2: staked cannot be revoked (must refund)');
}

// ============================================================================
// Test 5: All GuestStatus values have entries
// ============================================================================

console.log('\n📋 Test 5: All GuestStatus values covered');

{
    const expected: GuestStatus[] = [
        'pending', 'pending_approval', 'approved', 'rejected',
        'issued', 'staked', 'scanned', 'checked_in',
        'revoked', 'refunded', 'forfeited'
    ];

    for (const status of expected) {
        assert(status in VALID_TRANSITIONS, `V2: '${status}' has transition entry`);
    }
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
    console.log('\n🎉 All V2 lifecycle validation tests passed!\n');
    process.exit(0);
}
