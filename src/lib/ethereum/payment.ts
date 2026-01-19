/**
 * Ethereum Payment Utilities
 */

import { ethers } from 'ethers';

// Constants
// TODO: Replace with real organizer wallet
export const EVM_RECIPIENT_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // Hardhat default account #0 as placeholder
// export const EVM_RECIPIENT_ADDRESS = '0xYourRealWalletAddress'; 

export const SUPPORTED_CHAINS = {
    // Mainnet
    1: { name: 'Ethereum', currency: 'ETH' },
    // Testnets
    11155111: { name: 'Sepolia', currency: 'ETH' },
    // L2s
    8453: { name: 'Base', currency: 'ETH' },
    137: { name: 'Polygon', currency: 'MATIC' }
};

export type EthPaymentStatus = 'idle' | 'connecting' | 'switching_network' | 'creating_tx' | 'signing' | 'mining' | 'success' | 'error';

/**
 * Validate an EVM transaction hash
 * Returns { confirmed: false } on any error (RPC failure, timeout, etc.)
 * The caller should decide whether to trust unverified transactions
 */
export async function validateEvmTransaction(
    providerUrl: string,
    txHash: string,
    expectedAmount: string,
    expectedRecipient: string
): Promise<{ confirmed: boolean; from: string; error?: string }> {
    try {
        // Create provider with explicit network detection disabled for faster startup
        const provider = new ethers.JsonRpcProvider(providerUrl, undefined, {
            staticNetwork: true
        });

        // Add timeout to prevent hanging on slow/broken RPC
        const timeout = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('RPC timeout after 10s')), 10000)
        );

        const txPromise = provider.getTransaction(txHash);
        const tx = await Promise.race([txPromise, timeout]);

        if (!tx) {
            return { confirmed: false, from: '', error: 'Transaction not found' };
        }

        // Check confirmation with timeout
        const receiptPromise = provider.getTransactionReceipt(txHash);
        const receipt = await Promise.race([receiptPromise, timeout]);

        if (!receipt || receipt.status !== 1) { // 1 = success
            return { confirmed: false, from: '', error: 'Transaction not confirmed or failed' };
        }

        // Verify recipient
        if (tx.to?.toLowerCase() !== expectedRecipient.toLowerCase()) {
            return { confirmed: false, from: '', error: `Invalid recipient: ${tx.to}` };
        }

        // Verify Amount
        const valueInEth = ethers.formatEther(tx.value);
        if (parseFloat(valueInEth) < parseFloat(expectedAmount)) {
            return { confirmed: false, from: '', error: `Insufficient amount: ${valueInEth}` };
        }

        return { confirmed: true, from: tx.from };
    } catch (error: any) {
        // Catch ALL errors including provider initialization failures
        console.error('[validateEvmTransaction] Error:', error.message || error);
        return { confirmed: false, from: '', error: error.message || 'Unknown error' };
    }
}

