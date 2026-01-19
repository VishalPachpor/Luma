/**
 * Calendar Hooks
 * React Query hooks for managing calendars and subscriptions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    Calendar,
    CreateCalendarInput,
    UpdateCalendarInput,
    CalendarSubscription
} from '@/types';

// ============================================
// Fetch Hooks
// ============================================

export function useMyCalendars(userId?: string) {
    return useQuery({
        queryKey: ['calendars', 'owned', userId],
        queryFn: async () => {
            if (!userId) return [];
            const res = await fetch(`/api/calendars?userId=${userId}`);
            if (!res.ok) throw new Error('Failed to fetch calendars');
            return res.json() as Promise<Calendar[]>;
        },
        enabled: !!userId,
    });
}

export function useSubscribedCalendars(userId?: string) {
    // Note: You'll need to create a dedicated endpoint for listing subscriptions
    // Currently reusing the GET /api/calendars logic or assuming new endpoint
    // For now, let's implement a specific hook that calls a hypothetical or new endpoint
    // We should add GET /api/calendars/subscriptions?userId=...
    return useQuery({
        queryKey: ['calendars', 'subscribed', userId],
        queryFn: async () => {
            if (!userId) return [];
            // We need to implement this endpoint or filter on client
            // Let's assume we add a 'type=subscribed' param to the main route or use a new route
            // For now, let's assume we use /api/calendars/subscriptions
            const res = await fetch(`/api/calendars/subscriptions?userId=${userId}`); // Need to implement this route!
            if (!res.ok) return []; // Fail gracefully for now
            return res.json() as Promise<Calendar[]>;
        },
        enabled: !!userId,
    });
}

export function useCalendar(id: string) {
    return useQuery({
        queryKey: ['calendar', id],
        queryFn: async () => {
            const res = await fetch(`/api/calendars/${id}`);
            if (!res.ok) throw new Error('Failed to fetch calendar');
            return res.json() as Promise<Calendar>;
        },
        enabled: !!id,
    });
}

export function useCalendarBySlug(slug: string) {
    return useQuery({
        queryKey: ['calendar', 'slug', slug],
        queryFn: async () => {
            const res = await fetch(`/api/calendars?slug=${slug}`);
            if (!res.ok) throw new Error('Failed to fetch calendar');
            return res.json() as Promise<Calendar>;
        },
        enabled: !!slug,
    });
}

// ============================================
// Mutation Hooks
// ============================================

export function useCreateCalendar() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateCalendarInput & { userId: string }) => {
            const res = await fetch('/api/calendars', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create calendar');
            }
            return res.json() as Promise<Calendar>;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['calendars', 'owned', variables.userId] });
        },
    });
}

export function useUpdateCalendar() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data, userId }: { id: string; data: UpdateCalendarInput; userId: string }) => {
            const res = await fetch(`/api/calendars/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, userId }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update calendar');
            }
            return res.json() as Promise<Calendar>;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['calendar', data.id] });
            queryClient.invalidateQueries({ queryKey: ['calendars', 'owned'] });
        },
    });
}

export function useSubscribeToCalendar() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ calendarId, userId }: { calendarId: string; userId: string }) => {
            const res = await fetch(`/api/calendars/${calendarId}/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) throw new Error('Failed to subscribe');
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['calendars', 'subscribed', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['calendar', variables.calendarId] }); // Refresh subscriber count
        },
    });
}

export function useUnsubscribeFromCalendar() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ calendarId, userId }: { calendarId: string; userId: string }) => {
            const res = await fetch(`/api/calendars/${calendarId}/subscribe?userId=${userId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to unsubscribe');
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['calendars', 'subscribed', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['calendar', variables.calendarId] });
        },
    });
}
