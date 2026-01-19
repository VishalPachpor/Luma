/**
 * My Events Hook - React Query hook for user's RSVP'd events
 */

import { useQuery } from '@tanstack/react-query';
import * as myEventsService from '@/lib/services/myEvents.service';
import { rsvpKeys } from './useRSVP';

/**
 * Hook to fetch user's RSVP'd events
 */
export function useMyEvents(userId: string | undefined) {
    return useQuery({
        queryKey: rsvpKeys.myEvents(userId || ''),
        queryFn: () => myEventsService.getMyEvents(userId!),
        enabled: !!userId,
        staleTime: 60 * 1000, // Fresh for 1 minute
    });
}
