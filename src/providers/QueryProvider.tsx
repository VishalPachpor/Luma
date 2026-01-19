/**
 * React Query Provider
 * Configures TanStack Query for client-side caching
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

interface QueryProviderProps {
    children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
    // Create QueryClient instance with production-grade defaults
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Stale time: how long data is considered fresh (5 minutes)
                        staleTime: 5 * 60 * 1000,
                        // Cache time: how long inactive data stays in cache (30 minutes)
                        gcTime: 30 * 60 * 1000,
                        // Retry failed requests 2 times with exponential backoff
                        retry: 2,
                        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
                        // Don't refetch on window focus in production (reduces API calls)
                        refetchOnWindowFocus: false,
                        // Keep previous data while fetching new data
                        placeholderData: (previousData: unknown) => previousData,
                    },
                    mutations: {
                        // Retry mutations once
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
