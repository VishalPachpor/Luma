/**
 * Client Providers
 * Minimal wagmi setup without RainbowKit to avoid SSR issues
 */

'use client';

import { ReactNode, useEffect, useState } from 'react';
import { WagmiProvider, cookieToInitialState } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getConfig } from '@/lib/wagmi';

// Create a stable queryClient instance
const queryClient = new QueryClient();

interface Props {
    children: ReactNode;
    cookie?: string;
}

export function ClientProviders({ children, cookie }: Props) {
    const [mounted, setMounted] = useState(false);
    const [config] = useState(() => getConfig());

    // Only render wagmi providers after mount to avoid SSR issues
    useEffect(() => {
        setMounted(true);
    }, []);

    // Hydrate initial state from cookie on client
    const initialState = cookie ? cookieToInitialState(config, cookie) : undefined;

    // Always provide QueryClient, but only render WagmiProvider on client
    return (
        <QueryClientProvider client={queryClient}>
            {mounted ? (
                <WagmiProvider config={config} initialState={initialState}>
                    {children}
                </WagmiProvider>
            ) : (
                children
            )}
        </QueryClientProvider>
    );
}

