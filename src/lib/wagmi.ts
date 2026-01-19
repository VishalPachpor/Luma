/**
 * Wagmi Configuration
 * Minimal setup with only injected wallets for SSR compatibility
 */

import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export function getConfig() {
    return createConfig({
        chains: [mainnet, sepolia],
        connectors: [
            injected({ shimDisconnect: true }),
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
