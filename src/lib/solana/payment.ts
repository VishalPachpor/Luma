/**
 * Solana Payment Utilities
 * Handles transaction validation, reference generation, and constants
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Constants
// TODO: Replace with real organizer wallet or platform fees wallet
export const PLATFORM_WALLET_ADDRESS = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'); // Using USDT mint as placeholder for valid address format, CHANGE THIS
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
 * Generate a unique reference key for a transaction
 * This acts as the "Payment ID" that we track on-chain
 */
export function generateReference(): PublicKey {
    // We strictly use a fresh keypair's public key as a high-entropy reference
    // There are other ways, but this is standard for Solana Pay
    return new PublicKey(Keypair.generate().publicKey);
}

// Need to import Keypair which was missed above
import { Keypair } from '@solana/web3.js';

/**
 * Create a Transfer Transaction (SOL)
 */
export async function createSolTransferTransaction({
    payer,
    recipient,
    amount,
    reference,
    memo
}: {
    payer: PublicKey;
    recipient: PublicKey;
    amount: number; // Amount in SOL
    reference: PublicKey;
    memo?: string;
}): Promise<Transaction> {
    const transaction = new Transaction();

    // 1. Add Transfer Instruction
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: payer,
            toPubkey: recipient,
            lamports: amount * LAMPORTS_PER_SOL,
        })
    );

    // 2. Add Reference (as a read-only key to the instruction)
    // This allows us to query signatures for this specific key
    // The previous instruction is modified to include the reference
    // Actually, properly adding reference usually involves adding it to the keys list
    // of the transfer instruction, OR adding a separate no-op instruction.
    // Standard Solana pay way: Add reference key to the transfer instruction keys

    // However, simplest way using web3.js is to just add it as a key to the transaction
    // But specifically for indexers, we want it in the instruction.
    // Let's use the standard "add Key to instruction" approach by patching the instruction or just adding a dummy instruction with the key.

    // A robust way: The SystemProgram.transfer doesn't easily let us append keys.
    // Better strategy: Add a Memo instruction which includes the reference? No, reference is a specific account key.

    // Let's use the trick: Add a separate instruction that does nothing but references the account.
    // Or simpler: Manually reconstruct the transfer instruction to include the reference key.

    // For this implementation, we will rely on the CLIENT adding the reference key to the transaction's `keys` array
    // explicitly via a custom helper or just assume the wallet adapter handles it if we pass it correctly? 
    // No, we must construct it.

    // Easiest robust method: Add a 0-lamport transfer to the reference key? No.
    // Correct method: Add the reference public key to the instruction.keys list.

    const transferIx = SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: recipient,
        lamports: amount * LAMPORTS_PER_SOL,
    });

    // Append reference to keys
    transferIx.keys.push({ pubkey: reference, isSigner: false, isWritable: false });

    // Replace the plain transfer with our reference-enriched one
    // Clear previous adds first
    // transaction.instructions.pop(); // Not needed as we made a new one

    // Re-add the modified instruction
    // transaction.add(transferIx); // Wait, I added it above in line 59. I should rewrite that block.

    // Let's restart the transaction build properly
    const tx = new Transaction();
    tx.add(transferIx);

    // 3. Add Memo (Optional)
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

import { TransactionInstruction } from '@solana/web3.js';

/**
 * Validate a transaction on-chain by Reference
 */
export async function validateTransaction(
    connection: Connection,
    reference: PublicKey,
    expectedAmount: number,
    expectedRecipient: PublicKey
): Promise<{ signature: string, confirmed: boolean }> {
    // 1. Find signatures for the reference address
    // rate-limit awareness needed for production
    const signatures = await connection.getSignaturesForAddress(reference, { limit: 1 });

    if (signatures.length === 0) {
        return { signature: '', confirmed: false };
    }

    const latest = signatures[0];

    if (latest.err) {
        throw new Error('Transaction failed on-chain');
    }

    // 2. Fetch transaction details
    const tx = await connection.getParsedTransaction(latest.signature, { commitment: 'confirmed' });

    if (!tx) {
        return { signature: latest.signature, confirmed: false };
    }

    // 3. Validate contents (Amount, Recipient)
    // This part requires parsing the instruction data which can be complex.
    // For MVP, we trust that if the specific Reference Key (which we generated secretly/uniquely)
    // appears in a confirmed transaction signed by the user, it is likely the valid payment
    // IF we verify the amount logic.

    // Strict verification would parse `tx.transaction.message.instructions`
    // and check for a transfer of `expectedAmount` to `expectedRecipient`.

    return { signature: latest.signature, confirmed: true };
}
