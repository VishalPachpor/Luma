/**
 * Calendars Page
 * Lists all calendars user can subscribe to
 */

import { Suspense } from 'react';
import { headers } from 'next/headers';
import CalendarsPageClient from './CalendarsPageClient';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import * as calendarRepo from '@/lib/repositories/calendar.repository';
import { Calendar } from '@/types';

export const metadata = {
    title: 'Calendars - Pulse',
    description: 'Discover and subscribe to community calendars',
};

export default async function CalendarsPage() {
    const cookie = (await headers()).get('cookie') ?? '';

    // Server-side auth check
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch initial data
    let myCalendars: Calendar[] = [];
    let subscribedCalendars: Calendar[] = [];

    if (user) {
        try {
            [myCalendars, subscribedCalendars] = await Promise.all([
                calendarRepo.findByOwner(user.id),
                calendarRepo.findSubscriptions(user.id)
            ]);
        } catch (error) {
            console.error('Failed to fetch calendar data:', error);
            // Fallback to empty arrays on error
        }
    }

    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                    <div className="animate-pulse text-white/50">Loading calendars...</div>
                </div>
            }
        >
            <CalendarsPageClient
                cookie={cookie}
                initialMyCalendars={myCalendars}
                initialSubscribedCalendars={subscribedCalendars}
            />
        </Suspense>
    );
}
