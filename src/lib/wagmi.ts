/**
 * Wagmi Configuration
 * Prioritizes MetaMask over other injected wallets (Rainbow, etc.)
 */

import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { metaMask, injected } from 'wagmi/connectors';

export function getConfig() {
    return createConfig({
        // Put Sepolia first to make it the default chain
        // For production, swap order: [mainnet, sepolia]
        chains: [sepolia, mainnet],
        connectors: [
            // MetaMask connector first - highest priority
            metaMask({
                dappMetadata: { name: 'PlanX Events' },
            }),
            // Fallback to other injected wallets (Rainbow, Coinbase, etc.)
            injected(),
        ],
        ssr: true,
        storage: createStorage({
            storage: cookieStorage,
        }),
        transports: {
            [mainnet.id]: http(),
            [sepolia.id]: http(),
        },
    });
}

export const wagmiConfig = getConfig();
