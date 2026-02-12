/**
 * Events Page
 * Lists all upcoming events
 */

import { Suspense } from 'react';
import { headers } from 'next/headers';
import EventsPageClient from './EventsPageClient';

export const metadata = {
    title: 'Events - Pulse',
    description: 'Browse and discover upcoming events',
};

export default async function EventsPage() {
    // Pass cookie for auth
    const cookie = (await headers()).get('cookie') ?? '';

    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                    <div className="animate-pulse text-white/50">Loading events...</div>
                </div>
            }
        >
            <EventsPageClient cookie={cookie} />
        </Suspense>
    );
}
