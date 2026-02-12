/**
 * Events Page (Default / Home)
 * Lists all upcoming events
 */

import { Suspense } from 'react';
import { headers } from 'next/headers';
import EventsPageClient from './events/EventsPageClient';

export const metadata = {
    title: 'Events - Lumma',
    description: 'Browse and discover upcoming events',
};

export default async function HomePage() {
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
