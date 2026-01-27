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

    // Suppress Sentry-related errors (harmless errors from unconfigured Sentry or browser extensions)
    useEffect(() => {
        // Filter console errors to suppress Sentry batch sending failures
        // These occur when Sentry is initialized (e.g., by browser extension) but not properly configured
        const originalError = console.error;
        
        console.error = (...args: unknown[]) => {
            // Convert all arguments to string for pattern matching
            const errorMessage = args
                .map(arg => {
                    if (arg instanceof Error) {
                        return arg.message + ' ' + arg.stack;
                    }
                    return String(arg);
                })
                .join(' ');
            
            // Filter out Sentry batch sending errors
            if (
                errorMessage.includes('Sender: Failed to send batch') ||
                (errorMessage.includes('Failed to fetch') && errorMessage.includes('intercept-console-error')) ||
                (errorMessage.includes('Sender') && errorMessage.includes('Failed to send batch'))
            ) {
                // Silently ignore - Sentry is not configured or network issue
                return;
            }
            
            // Pass through all other errors
            originalError.apply(console, args);
        };

        // Cleanup on unmount
        return () => {
            console.error = originalError;
        };
    }, []);

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

