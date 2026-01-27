/**
 * End-to-End Escrow Test Script
 * 
 * Automated test script for testing the escrow flow
 * Run with: npx tsx test-escrow-flow.ts
 */

import { ethers } from 'ethers';
import { hashEventId, ESCROW_ABI, getEscrowAddress } from './src/lib/contracts/escrow';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
    RPC_URL: process.env.ETH_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
    CHAIN_ID: 11155111, // Sepolia
    ESCROW_ADDRESS: process.env.NEXT_PUBLIC_ESCROW_ADDRESS || '',
    API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    
    // Test wallets (use test accounts, never real keys)
    ORGANIZER_PRIVATE_KEY: process.env.TEST_ORGANIZER_KEY || '',
    ATTENDEE_PRIVATE_KEY: process.env.TEST_ATTENDEE_KEY || '',
    
    // Test event data
    EVENT_ID: process.env.TEST_EVENT_ID || '',
    GUEST_ID: process.env.TEST_GUEST_ID || '',
};

// ============================================================================
// Test Utilities
// ============================================================================

class EscrowTester {
    private provider: ethers.JsonRpcProvider;
    private organizerWallet: ethers.Wallet;
    private attendeeWallet: ethers.Wallet;
    private escrowContract: ethers.Contract;

    constructor() {
        if (!CONFIG.ESCROW_ADDRESS || CONFIG.ESCROW_ADDRESS === '0x0000000000000000000000000000000000000000') {
            throw new Error('NEXT_PUBLIC_ESCROW_ADDRESS not set');
        }

        this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        this.organizerWallet = new ethers.Wallet(CONFIG.ORGANIZER_PRIVATE_KEY, this.provider);
        this.attendeeWallet = new ethers.Wallet(CONFIG.ATTENDEE_PRIVATE_KEY, this.provider);
        this.escrowContract = new ethers.Contract(
            CONFIG.ESCROW_ADDRESS,
            ESCROW_ABI,
            this.attendeeWallet // Default to attendee for staking
        );
    }

    async log(message: string, data?: any) {
        console.log(`\n[${new Date().toISOString()}] ${message}`);
        if (data) console.log(JSON.stringify(data, null, 2));
    }

    async getBalances() {
        const organizerBalance = await this.provider.getBalance(this.organizerWallet.address);
        const attendeeBalance = await this.provider.getBalance(this.attendeeWallet.address);

        return {
            organizer: ethers.formatEther(organizerBalance),
            attendee: ethers.formatEther(attendeeBalance),
        };
    }

    async waitForTx(tx: ethers.ContractTransactionResponse, label: string) {
        this.log(`⏳ Waiting for ${label}...`);
        const receipt = await tx.wait();
        this.log(`✅ ${label} confirmed`, {
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
        });
        return receipt;
    }
}

// ============================================================================
// Test Functions
// ============================================================================

/**
 * Test 1: Stake ETH on-chain
 */
async function testStake(tester: EscrowTester, eventId: string, eventStartTime: number) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: Stake ETH On-Chain');
    console.log('='.repeat(60));

    const eventIdHash = hashEventId(eventId);
    const stakeAmount = ethers.parseEther('0.001'); // Minimum stake
    const organizerAddress = tester.organizerWallet.address;

    tester.log('Staking parameters', {
        eventId,
        eventIdHash,
        organizerAddress,
        stakeAmount: ethers.formatEther(stakeAmount),
        attendeeAddress: tester.attendeeWallet.address,
    });

    // Check current stake status
    const contract = new ethers.Contract(
        CONFIG.ESCROW_ADDRESS,
        ESCROW_ABI,
        tester.provider
    );

    const hasStake = await contract.hasActiveStake(eventIdHash, tester.attendeeWallet.address);
    if (hasStake) {
        tester.log('⚠️  Stake already exists, skipping...');
        return { txHash: 'already-staked' };
    }

    // Execute stake
    const tx = await tester.escrowContract.stake(
        eventIdHash,
        organizerAddress,
        eventStartTime,
        { value: stakeAmount }
    );

    const receipt = await tester.waitForTx(tx, 'Stake transaction');

    // Verify stake
    const stakeInfo = await contract.getStake(eventIdHash, tester.attendeeWallet.address);
    tester.log('Stake info', {
        amount: ethers.formatEther(stakeInfo[0]),
        organizer: stakeInfo[1],
        status: stakeInfo[2], // 1 = Staked
        stakedAt: new Date(Number(stakeInfo[3]) * 1000).toISOString(),
        eventStartTime: new Date(Number(stakeInfo[4]) * 1000).toISOString(),
    });

    return {
        txHash: receipt.hash,
        walletAddress: tester.attendeeWallet.address,
        stakeInfo: {
            amount: ethers.formatEther(stakeInfo[0]),
            status: Number(stakeInfo[2]),
        },
    };
}

/**
 * Test 2: Verify stake via API
 */
async function testVerifyStake(eventId: string, walletAddress: string, txHash: string, guestId?: string) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Verify Stake via API');
    console.log('='.repeat(60));

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/escrow/stake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            eventId,
            walletAddress,
            txHash,
            guestId,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`API Error: ${data.error}`);
    }

    console.log('✅ Stake verified', data);
    return data;
}

/**
 * Test 3: Check stake status via API
 */
async function testGetStakeStatus(eventId: string, walletAddress: string) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Get Stake Status');
    console.log('='.repeat(60));

    const url = `${CONFIG.API_BASE_URL}/api/escrow/stake?eventId=${eventId}&walletAddress=${walletAddress}`;
    const response = await fetch(url);
    const data = await response.json();

    console.log('Stake status', data);
    return data;
}

/**
 * Test 4: Release stake (simulate check-in)
 */
async function testReleaseStake(
    tester: EscrowTester,
    eventId: string,
    attendeeAddress: string
) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Release Stake (Check-in)');
    console.log('='.repeat(60));

    const eventIdHash = hashEventId(eventId);
    const contract = new ethers.Contract(
        CONFIG.ESCROW_ADDRESS,
        ESCROW_ABI,
        tester.organizerWallet // Organizer calls release
    );

    // Check current status
    const stakeInfoBefore = await contract.getStake(eventIdHash, attendeeAddress);
    console.log('Status before release:', stakeInfoBefore[2]); // Should be 1 (Staked)

    if (Number(stakeInfoBefore[2]) !== 1) {
        throw new Error(`Invalid stake status: ${stakeInfoBefore[2]}, expected 1 (Staked)`);
    }

    // Get balances before
    const balancesBefore = await tester.getBalances();
    tester.log('Balances before release', balancesBefore);

    // Execute release
    const tx = await contract.release(eventIdHash, attendeeAddress);
    const receipt = await tester.waitForTx(tx, 'Release transaction');

    // Verify release
    const stakeInfoAfter = await contract.getStake(eventIdHash, attendeeAddress);
    console.log('Status after release:', stakeInfoAfter[2]); // Should be 2 (Released)

    // Get balances after
    const balancesAfter = await tester.getBalances();
    tester.log('Balances after release', balancesAfter);

    const organizerIncrease = parseFloat(balancesAfter.organizer) - parseFloat(balancesBefore.organizer);
    tester.log('Organizer received', { eth: organizerIncrease });

    return {
        txHash: receipt.hash,
        status: Number(stakeInfoAfter[2]),
        organizerReceived: organizerIncrease,
    };
}

/**
 * Test 5: Refund stake (before event)
 */
async function testRefundStake(tester: EscrowTester, eventId: string) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: Refund Stake');
    console.log('='.repeat(60));

    const eventIdHash = hashEventId(eventId);
    const contract = new ethers.Contract(
        CONFIG.ESCROW_ADDRESS,
        ESCROW_ABI,
        tester.attendeeWallet // Attendee calls refund
    );

    // Get balances before
    const balancesBefore = await tester.getBalances();

    // Execute refund
    const tx = await contract.refund(eventIdHash);
    const receipt = await tester.waitForTx(tx, 'Refund transaction');

    // Verify refund
    const stakeInfo = await contract.getStake(eventIdHash, tester.attendeeWallet.address);
    console.log('Status after refund:', stakeInfo[2]); // Should be 3 (Refunded)

    // Get balances after
    const balancesAfter = await tester.getBalances();
    const attendeeIncrease = parseFloat(balancesAfter.attendee) - parseFloat(balancesBefore.attendee);

    tester.log('Attendee received refund', { eth: attendeeIncrease });

    return {
        txHash: receipt.hash,
        status: Number(stakeInfo[2]),
        attendeeReceived: attendeeIncrease,
    };
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
    console.log('\n🚀 Starting Escrow End-to-End Tests\n');
    console.log('Configuration:', {
        escrowAddress: CONFIG.ESCROW_ADDRESS,
        chainId: CONFIG.CHAIN_ID,
        rpcUrl: CONFIG.RPC_URL,
    });

    if (!CONFIG.EVENT_ID) {
        console.error('❌ TEST_EVENT_ID not set');
        process.exit(1);
    }

    const tester = new EscrowTester();

    try {
        // Get initial balances
        const initialBalances = await tester.getBalances();
        tester.log('Initial balances', initialBalances);

        // Calculate event start time (2 hours from now for refund testing)
        const eventStartTime = Math.floor(Date.now() / 1000) + 2 * 60 * 60;

        // Test 1: Stake
        const stakeResult = await testStake(tester, CONFIG.EVENT_ID, eventStartTime);

        if (stakeResult.txHash === 'already-staked') {
            console.log('⚠️  Skipping verification - stake already exists');
        } else {
            // Test 2: Verify stake via API
            await testVerifyStake(
                CONFIG.EVENT_ID,
                stakeResult.walletAddress,
                stakeResult.txHash,
                CONFIG.GUEST_ID
            );

            // Test 3: Get stake status
            await testGetStakeStatus(CONFIG.EVENT_ID, stakeResult.walletAddress);

            // Test 4: Release (check-in)
            // Uncomment to test release:
            // await testReleaseStake(tester, CONFIG.EVENT_ID, stakeResult.walletAddress);

            // Test 5: Refund (before event)
            // Uncomment to test refund (must be before event start - 1 hour):
            // await testRefundStake(tester, CONFIG.EVENT_ID);
        }

        // Final balances
        const finalBalances = await tester.getBalances();
        tester.log('Final balances', finalBalances);

        console.log('\n✅ All tests completed successfully!\n');

    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run tests
if (require.main === module) {
    runTests().catch(console.error);
}

export { runTests, testStake, testVerifyStake, testReleaseStake, testRefundStake };
