/**
 * RSVP Hooks - React Query hooks for RSVP operations
 * Includes optimistic updates for instant UI feedback
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as rsvpService from '@/lib/services/rsvp.service';
import type { RSVPStatus, EventAttendee } from '@/lib/services/rsvp.service';
import { eventKeys } from './useEvents';

// Query Keys
export const rsvpKeys = {
    all: ['rsvps'] as const,
    userRsvp: (eventId: string, userId: string) => [...rsvpKeys.all, 'user', eventId, userId] as const,
    eventAttendees: (eventId: string) => [...rsvpKeys.all, 'attendees', eventId] as const,
    myEvents: (userId: string) => [...rsvpKeys.all, 'myEvents', userId] as const,
};

/**
 * Hook to check user's RSVP status for an event
 */
export function useUserRSVP(eventId: string, userId: string | undefined) {
    return useQuery({
        queryKey: rsvpKeys.userRsvp(eventId, userId || ''),
        queryFn: () => rsvpService.getUserRSVP(eventId, userId!),
        enabled: !!eventId && !!userId,
        staleTime: 30 * 1000, // Fresh for 30 seconds (RSVP status changes frequently)
    });
}

/**
 * Hook to get event attendees
 */
export function useEventAttendees(eventId: string) {
    return useQuery({
        queryKey: rsvpKeys.eventAttendees(eventId),
        queryFn: () => rsvpService.getEventAttendees(eventId),
        enabled: !!eventId,
    });
}

/**
 * Hook to RSVP to an event with optimistic updates
 */
export function useRSVPToEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            eventId,
            userId,
            userInfo,
            status = 'going' as RSVPStatus,
            answers,
        }: {
            eventId: string;
            userId: string;
            userInfo: { displayName: string; photoURL: string | null; email: string };
            status?: RSVPStatus;
            answers?: Record<string, string | string[]>;
        }) => rsvpService.rsvpToEvent(eventId, userId, userInfo, status, answers),

        // Optimistic update - show RSVP immediately
        onMutate: async ({ eventId, userId, userInfo, status }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: rsvpKeys.userRsvp(eventId, userId) });

            // Snapshot previous value
            const previousRsvp = queryClient.getQueryData(rsvpKeys.userRsvp(eventId, userId));

            // Optimistically update cache
            const optimisticRsvp: EventAttendee = {
                userId,
                displayName: userInfo.displayName,
                photoURL: userInfo.photoURL,
                email: userInfo.email,
                status: status || 'going',
                rsvpAt: new Date(),
            };
            queryClient.setQueryData(rsvpKeys.userRsvp(eventId, userId), optimisticRsvp);

            return { previousRsvp };
        },

        // Rollback on error
        onError: (_err, { eventId, userId }, context) => {
            if (context?.previousRsvp !== undefined) {
                queryClient.setQueryData(rsvpKeys.userRsvp(eventId, userId), context.previousRsvp);
            }
        },

        // Refetch after success
        onSettled: (_data, _error, { eventId, userId }) => {
            queryClient.invalidateQueries({ queryKey: rsvpKeys.userRsvp(eventId, userId) });
            queryClient.invalidateQueries({ queryKey: rsvpKeys.eventAttendees(eventId) });
            queryClient.invalidateQueries({ queryKey: rsvpKeys.myEvents(userId) });
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
        },
    });
}

/**
 * Hook to cancel RSVP with optimistic updates
 */
export function useCancelRSVP() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
            rsvpService.cancelRSVP(eventId, userId),

        // Optimistic update - remove RSVP immediately
        onMutate: async ({ eventId, userId }) => {
            await queryClient.cancelQueries({ queryKey: rsvpKeys.userRsvp(eventId, userId) });
            const previousRsvp = queryClient.getQueryData(rsvpKeys.userRsvp(eventId, userId));
            queryClient.setQueryData(rsvpKeys.userRsvp(eventId, userId), null);
            return { previousRsvp };
        },

        onError: (_err, { eventId, userId }, context) => {
            if (context?.previousRsvp !== undefined) {
                queryClient.setQueryData(rsvpKeys.userRsvp(eventId, userId), context.previousRsvp);
            }
        },

        onSettled: (_data, _error, { eventId, userId }) => {
            queryClient.invalidateQueries({ queryKey: rsvpKeys.userRsvp(eventId, userId) });
            queryClient.invalidateQueries({ queryKey: rsvpKeys.eventAttendees(eventId) });
            queryClient.invalidateQueries({ queryKey: rsvpKeys.myEvents(userId) });
        },
    });
}
