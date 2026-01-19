/**
 * Events API Route
 * RESTful API endpoint for events
 */

import { NextRequest, NextResponse } from 'next/server';
import * as eventRepo from '@/lib/repositories/event.repository';

/**
 * GET /api/events
 * Get all events, optionally filtered by query params
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const city = searchParams.get('city');
        const tag = searchParams.get('tag');
        const search = searchParams.get('search');

        let events;

        if (search) {
            events = await eventRepo.search(search);
        } else if (city) {
            events = await eventRepo.findByCity(city);
        } else if (tag) {
            events = await eventRepo.findByTag(tag);
        } else {
            events = await eventRepo.findAll();
        }

        return NextResponse.json({ events, count: events.length });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch events' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/events
 * Create a new event
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.title) {
            return NextResponse.json(
                { error: 'Title is required' },
                { status: 400 }
            );
        }

        const event = await eventRepo.create({
            title: body.title,
            description: body.description || '',
            date: body.date || new Date().toISOString(),
            location: body.location || 'TBD',
            city: body.city || 'Unknown',
            coords: body.coords || { lat: 0, lng: 0 },
            coverImage: body.coverImage || 'https://picsum.photos/seed/default/800/600',
            attendees: body.attendees || 0,
            tags: body.tags || [],
            organizer: body.organizer || 'Anonymous',
            price: body.price,
            registrationQuestions: body.registrationQuestions, // Pass questions to repo
            status: 'published',
            visibility: 'public',
        });

        return NextResponse.json({ event }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create event' },
            { status: 500 }
        );
    }
}
