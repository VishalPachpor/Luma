/**
 * Home Page
 * Shows landing page for unauthenticated users, events for authenticated users
 */

import { Suspense } from 'react';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import EventsPageClient from './events/EventsPageClient';
import LandingPage from './LandingPage';

export const metadata = {
    title: 'Lumma - Delightful events start here',
    description: 'Set up an event page, invite friends and sell tickets. Host a memorable event today.',
};

export default async function HomePage() {
    // Pass cookie for auth
    const cookie = (await headers()).get('cookie') ?? '';

    // Server-side auth check
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Show landing page for unauthenticated users
    if (!user) {
        return <LandingPage />;
    }

    // Show events page for authenticated users
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
