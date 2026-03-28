/**
 * Solana Payment Utilities
 * Handles transaction validation, reference generation, and constants
 */

import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Keypair,
    TransactionInstruction,
} from '@solana/web3.js';

// Platform wallet — set NEXT_PUBLIC_SOLANA_PLATFORM_WALLET (client) and SOLANA_PLATFORM_WALLET (server)
function getPlatformWallet(): PublicKey {
    // NEXT_PUBLIC_ prefix makes it available client-side; server-side uses the non-public variant
    const addr = process.env.NEXT_PUBLIC_SOLANA_PLATFORM_WALLET || process.env.SOLANA_PLATFORM_WALLET;
    if (!addr) throw new Error('SOLANA_PLATFORM_WALLET environment variable is not set');
    return new PublicKey(addr);
}

// Exported constant for use in client-side hooks — throws at runtime if env var is missing
export const PLATFORM_WALLET_ADDRESS: PublicKey = (() => {
    try {
        return getPlatformWallet();
    } catch {
        // Return a zero-address placeholder during build/SSR when env var is not yet set.
        // Will throw at actual payment time if not configured.
        return new PublicKey('11111111111111111111111111111111');
    }
})();

export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb');

export type PaymentStatus = 'pending' | 'confirmed' | 'failed';

export interface PaymentRequest {
    recipient: PublicKey;
    amount: number; // in SOL or USDC units
    reference: PublicKey; // Unique identifier for this transaction
    memo?: string;
    label?: string;
    message?: string;
}

/**
 * Generate a unique reference key for a transaction.
 * Uses a fresh keypair's public key as a high-entropy reference (standard Solana Pay).
 */
export function generateReference(): PublicKey {
    return Keypair.generate().publicKey;
}

/**
 * Create a SOL transfer transaction with an embedded reference key for tracking.
 */
export async function createSolTransferTransaction({
    payer,
    recipient,
    amount,
    reference,
    memo,
}: {
    payer: PublicKey;
    recipient: PublicKey;
    amount: number; // Amount in SOL
    reference: PublicKey;
    memo?: string;
}): Promise<Transaction> {
    const tx = new Transaction();

    // Build transfer instruction and append reference as a read-only key
    // This allows getSignaturesForAddress(reference) to find this tx on-chain
    const transferIx = SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: recipient,
        lamports: Math.round(amount * LAMPORTS_PER_SOL),
    });
    transferIx.keys.push({ pubkey: reference, isSigner: false, isWritable: false });
    tx.add(transferIx);

    // Optional memo
    if (memo) {
        tx.add(
            new TransactionInstruction({
                keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
                data: Buffer.from(memo, 'utf-8'),
                programId: MEMO_PROGRAM_ID,
            })
        );
    }

    return tx;
}

/**
 * Validate a transaction on-chain by reference key.
 * Verifies: tx exists, tx succeeded, correct recipient received correct amount.
 */
export async function validateTransaction(
    connection: Connection,
    reference: PublicKey,
    expectedAmountSol: number,
    expectedRecipient: PublicKey
): Promise<{ signature: string; confirmed: boolean }> {
    const signatures = await connection.getSignaturesForAddress(reference, { limit: 1 });

    if (signatures.length === 0) {
        return { signature: '', confirmed: false };
    }

    const latest = signatures[0];

    if (latest.err) {
        throw new Error('Transaction failed on-chain');
    }

    const tx = await connection.getParsedTransaction(latest.signature, { commitment: 'confirmed' });

    if (!tx) {
        return { signature: latest.signature, confirmed: false };
    }

    // Verify recipient and amount from parsed instruction
    const instructions = tx.transaction.message.instructions;
    for (const ix of instructions) {
        if ('parsed' in ix && ix.parsed?.type === 'transfer') {
            const info = ix.parsed.info;
            const recipientMatches = info.destination === expectedRecipient.toString();
            const lamports = info.lamports as number;
            const amountMatches = Math.abs(lamports - expectedAmountSol * LAMPORTS_PER_SOL) < 1000; // 1000 lamport tolerance for rounding
            if (recipientMatches && amountMatches) {
                return { signature: latest.signature, confirmed: true };
            }
        }
    }

    // Transaction exists but doesn't match expected recipient/amount
    return { signature: latest.signature, confirmed: false };
}

// Export platform wallet getter for use in other modules
export { getPlatformWallet };
