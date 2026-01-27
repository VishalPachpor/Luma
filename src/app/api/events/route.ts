/**
 * Events API Route
 * Fetches events for the events listing page
 * OPTIMIZED: Selective columns, database filtering, caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Revalidate cache every 60 seconds
export const revalidate = 60;

export async function GET(request: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json(
                { error: 'Supabase configuration missing' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const now = new Date();

        // PERFORMANCE: Select only needed columns, let DB filter
        const { data: events, error } = await supabase
            .from('events')
            .select(`
                id, title, description, date, location, city,
                latitude, longitude, cover_image, attendee_count,
                tags, organizer_name, organizer_id, calendar_id,
                capacity, price, status, visibility, require_approval,
                theme, theme_color, created_at
            `)
            .in('status', ['published', 'ended', 'live'])
            .order('date', { ascending: true })
            .limit(100); // Pagination limit

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        // Lightweight normalization (skip heavy fields not needed for listing)
        const normalizedEvents = (events || []).map(event => ({
            id: event.id,
            title: event.title,
            description: event.description,
            date: event.date,
            location: event.location,
            city: event.city,
            latitude: event.latitude,
            longitude: event.longitude,
            coverImage: event.cover_image,
            attendees: event.attendee_count,
            tags: event.tags || [],
            organizer: event.organizer_name,
            organizerId: event.organizer_id,
            calendarId: event.calendar_id,
            capacity: event.capacity,
            price: event.price,
            status: event.status,
            visibility: event.visibility,
            requireApproval: event.require_approval,
            theme: event.theme,
            themeColor: event.theme_color,
            createdAt: event.created_at,
        }));

        // Count past/upcoming for metadata
        const nowMs = now.getTime();
        let pastCount = 0, upcomingCount = 0;
        for (const e of normalizedEvents) {
            if (new Date(e.date).getTime() < nowMs) pastCount++;
            else upcomingCount++;
        }

        const response = NextResponse.json({
            success: true,
            events: normalizedEvents,
            metadata: {
                total: normalizedEvents.length,
                past: pastCount,
                upcoming: upcomingCount,
                currentTime: now.toISOString(),
            }
        });

        // Add cache headers for CDN/browser caching
        response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        
        return response;

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch events' },
            { status: 500 }
        );
    }
}
