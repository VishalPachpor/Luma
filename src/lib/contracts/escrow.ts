/**
 * EventEscrow Contract SDK
 * 
 * TypeScript SDK for interacting with the EventEscrow smart contract.
 * Works with Wagmi/Viem on the frontend.
 */

import { ethers } from 'ethers';

// ============================================================================
// Contract Configuration
// ============================================================================

/**
 * Deployed contract addresses per network
 * Update NEXT_PUBLIC_ESCROW_ADDRESS after deployment
 */
export const ESCROW_ADDRESSES: Record<number, string> = {
    // Sepolia Testnet
    11155111: process.env.NEXT_PUBLIC_ESCROW_ADDRESS || '0x0000000000000000000000000000000000000000',
    // Mainnet (future)
    1: '',
    // Base (future)
    8453: '',
};

/**
 * Get escrow contract address for a chain
 */
export function getEscrowAddress(chainId: number): string | null {
    return ESCROW_ADDRESSES[chainId] || null;
}

// ============================================================================
// Contract ABI (Minimal - only used functions)
// ============================================================================

export const ESCROW_ABI = [
    // Read functions
    {
        inputs: [
            { name: 'eventId', type: 'bytes32' },
            { name: 'attendee', type: 'address' }
        ],
        name: 'getStake',
        outputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'organizer', type: 'address' },
            { name: 'status', type: 'uint8' },
            { name: 'stakedAt', type: 'uint256' },
            { name: 'eventStartTime', type: 'uint256' }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            { name: 'eventId', type: 'bytes32' },
            { name: 'attendee', type: 'address' }
        ],
        name: 'hasActiveStake',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [{ name: 'eventId', type: 'string' }],
        name: 'hashEventId',
        outputs: [{ name: '', type: 'bytes32' }],
        stateMutability: 'pure',
        type: 'function'
    },
    // Write functions
    {
        inputs: [
            { name: 'eventId', type: 'bytes32' },
            { name: 'organizer', type: 'address' },
            { name: 'eventStartTime', type: 'uint256' }
        ],
        name: 'stake',
        outputs: [],
        stateMutability: 'payable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'eventId', type: 'bytes32' },
            { name: 'attendee', type: 'address' }
        ],
        name: 'release',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [{ name: 'eventId', type: 'bytes32' }],
        name: 'refund',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'eventId', type: 'bytes32' },
            { name: 'attendee', type: 'address' }
        ],
        name: 'forfeit',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    // Events
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'eventId', type: 'bytes32' },
            { indexed: true, name: 'attendee', type: 'address' },
            { indexed: true, name: 'organizer', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
            { indexed: false, name: 'eventStartTime', type: 'uint256' }
        ],
        name: 'Staked',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'eventId', type: 'bytes32' },
            { indexed: true, name: 'attendee', type: 'address' },
            { indexed: true, name: 'organizer', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' }
        ],
        name: 'Released',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'eventId', type: 'bytes32' },
            { indexed: true, name: 'attendee', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' }
        ],
        name: 'Refunded',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'eventId', type: 'bytes32' },
            { indexed: true, name: 'attendee', type: 'address' },
            { indexed: true, name: 'organizer', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' }
        ],
        name: 'Forfeited',
        type: 'event'
    }
] as const;

// ============================================================================
// Stake Status Enum
// ============================================================================

export enum StakeStatus {
    None = 0,
    Staked = 1,
    Released = 2,
    Refunded = 3,
    Forfeited = 4
}

export const STAKE_STATUS_LABELS: Record<StakeStatus, string> = {
    [StakeStatus.None]: 'Not Staked',
    [StakeStatus.Staked]: 'Staked',
    [StakeStatus.Released]: 'Released',
    [StakeStatus.Refunded]: 'Refunded',
    [StakeStatus.Forfeited]: 'Forfeited'
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a string event ID to bytes32 hash (matches contract's hashEventId)
 */
export function hashEventId(eventId: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(eventId));
}

/**
 * Parse stake info from contract response
 */
export interface StakeInfo {
    amount: bigint;
    amountEth: string;
    organizer: string;
    status: StakeStatus;
    stakedAt: Date;
    eventStartTime: Date;
}

export function parseStakeInfo(data: readonly [bigint, string, number, bigint, bigint]): StakeInfo {
    return {
        amount: data[0],
        amountEth: ethers.formatEther(data[0]),
        organizer: data[1],
        status: data[2] as StakeStatus,
        stakedAt: new Date(Number(data[3]) * 1000),
        eventStartTime: new Date(Number(data[4]) * 1000),
    };
}

// ============================================================================
// Contract Interaction Functions (for backend use with ethers.js)
// ============================================================================

/**
 * Create ethers contract instance for reading
 */
export function getEscrowContract(providerUrl: string, chainId: number): ethers.Contract | null {
    const address = getEscrowAddress(chainId);
    if (!address || address === '0x0000000000000000000000000000000000000000') {
        return null;
    }

    const provider = new ethers.JsonRpcProvider(providerUrl);
    return new ethers.Contract(address, ESCROW_ABI, provider);
}

/**
 * Create ethers contract instance for writing (with signer)
 */
export function getEscrowContractWithSigner(
    providerUrl: string,
    chainId: number,
    privateKey: string
): ethers.Contract | null {
    const address = getEscrowAddress(chainId);
    if (!address || address === '0x0000000000000000000000000000000000000000') {
        return null;
    }

    const provider = new ethers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    return new ethers.Contract(address, ESCROW_ABI, wallet);
}

/**
 * Check if attendee has active stake
 */
export async function hasActiveStake(
    providerUrl: string,
    chainId: number,
    eventId: string,
    attendeeAddress: string
): Promise<boolean> {
    const contract = getEscrowContract(providerUrl, chainId);
    if (!contract) return false;

    try {
        const eventIdHash = hashEventId(eventId);
        return await contract.hasActiveStake(eventIdHash, attendeeAddress);
    } catch (error) {
        console.error('[Escrow SDK] hasActiveStake error:', error);
        return false;
    }
}

/**
 * Get stake info for attendee
 */
export async function getStakeInfo(
    providerUrl: string,
    chainId: number,
    eventId: string,
    attendeeAddress: string
): Promise<StakeInfo | null> {
    const contract = getEscrowContract(providerUrl, chainId);
    if (!contract) return null;

    try {
        const eventIdHash = hashEventId(eventId);
        const data = await contract.getStake(eventIdHash, attendeeAddress);
        return parseStakeInfo(data);
    } catch (error) {
        console.error('[Escrow SDK] getStakeInfo error:', error);
        return null;
    }
}

/**
 * Release stake to organizer (backend call on check-in)
 */
export async function releaseStake(
    providerUrl: string,
    chainId: number,
    privateKey: string,
    eventId: string,
    attendeeAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const contract = getEscrowContractWithSigner(providerUrl, chainId, privateKey);
    if (!contract) {
        return { success: false, error: 'Contract not configured for this chain' };
    }

    try {
        const eventIdHash = hashEventId(eventId);
        const tx = await contract.release(eventIdHash, attendeeAddress);
        await tx.wait();
        return { success: true, txHash: tx.hash };
    } catch (error: any) {
        console.error('[Escrow SDK] releaseStake error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Forfeit stake (backend call for no-show)
 */
export async function forfeitStake(
    providerUrl: string,
    chainId: number,
    privateKey: string,
    eventId: string,
    attendeeAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const contract = getEscrowContractWithSigner(providerUrl, chainId, privateKey);
    if (!contract) {
        return { success: false, error: 'Contract not configured for this chain' };
    }

    try {
        const eventIdHash = hashEventId(eventId);
        const tx = await contract.forfeit(eventIdHash, attendeeAddress);
        await tx.wait();
        return { success: true, txHash: tx.hash };
    } catch (error: any) {
        console.error('[Escrow SDK] forfeitStake error:', error);
        return { success: false, error: error.message };
    }
}
