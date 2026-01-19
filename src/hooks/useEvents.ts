/**
 * Event Hooks - React Query hooks for event data
 * Production-grade caching, deduplication, and background refetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as eventRepo from '@/lib/repositories/event.repository';
import type { Event, CreateEventInput } from '@/types';

// Query Keys - centralized for cache invalidation
export const eventKeys = {
    all: ['events'] as const,
    lists: () => [...eventKeys.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...eventKeys.lists(), filters] as const,
    details: () => [...eventKeys.all, 'detail'] as const,
    detail: (id: string) => [...eventKeys.details(), id] as const,
    byCity: (city: string) => [...eventKeys.all, 'city', city] as const,
    byTag: (tag: string) => [...eventKeys.all, 'tag', tag] as const,
};

/**
 * Hook to fetch all events
 */
export function useEvents() {
    return useQuery({
        queryKey: eventKeys.lists(),
        queryFn: () => eventRepo.findAll(),
    });
}

/**
 * Hook to fetch a single event by ID
 */
export function useEvent(id: string | undefined) {
    return useQuery({
        queryKey: eventKeys.detail(id || ''),
        queryFn: () => eventRepo.findById(id!),
        enabled: !!id,
    });
}

/**
 * Hook to fetch events by city
 */
export function useEventsByCity(city: string) {
    return useQuery({
        queryKey: eventKeys.byCity(city),
        queryFn: () => eventRepo.findByCity(city),
        enabled: !!city,
    });
}

/**
 * Hook to fetch events by tag
 */
export function useEventsByTag(tag: string) {
    return useQuery({
        queryKey: eventKeys.byTag(tag),
        queryFn: () => eventRepo.findByTag(tag),
        enabled: !!tag,
    });
}

/**
 * Hook to search events
 */
export function useEventSearch(query: string) {
    return useQuery({
        queryKey: [...eventKeys.all, 'search', query],
        queryFn: () => eventRepo.search(query),
        enabled: query.length >= 2,
    });
}

/**
 * Hook to create an event with optimistic updates
 */
export function useCreateEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateEventInput) => eventRepo.create(input),
        onSuccess: (newEvent) => {
            // Invalidate and refetch event lists
            queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
            // Optionally, add the new event to cache immediately
            queryClient.setQueryData(eventKeys.detail(newEvent.id), newEvent);
        },
    });
}

/**
 * Hook to fetch events by organizer
 */
export function useEventsByOrganizer(userId: string | undefined) {
    return useQuery({
        queryKey: [...eventKeys.all, 'organizer', userId],
        queryFn: () => {
            if (!userId) return Promise.resolve([]);
            return eventRepo.findByOrganizer(userId);
        },
        enabled: !!userId,
    });
}

/**
 * Hook to delete an event
 */
export function useDeleteEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => eventRepo.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventKeys.all });
        }
    });
}

/**
 * Hook to update an event
 */
export function useUpdateEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateEventInput> }) =>
            eventRepo.update(id, updates),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: eventKeys.all });
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.id) });
        }
    });
}
