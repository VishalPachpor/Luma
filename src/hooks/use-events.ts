/**
 * useEvents Hook
 * Custom hook for event data with client-side caching
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/types';

interface UseEventsOptions {
    city?: string;
    tag?: string;
    search?: string;
}

interface UseEventsReturn {
    events: Event[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Hook for fetching events from the API
 */
export function useEvents(options: UseEventsOptions = {}): UseEventsReturn {
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (options.city) params.set('city', options.city);
            if (options.tag) params.set('tag', options.tag);
            if (options.search) params.set('search', options.search);

            const queryString = params.toString();
            const url = `/api/events${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch events');

            const data = await response.json();
            setEvents(data.events);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, [options.city, options.tag, options.search]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    return { events, isLoading, error, refetch: fetchEvents };
}
