
'use client';

import { useViewTracking } from '@/hooks/useViewTracking';

export const ViewTracker = ({ eventId }: { eventId: string }) => {
    useViewTracking(eventId);
    return null; // Render nothing
};
