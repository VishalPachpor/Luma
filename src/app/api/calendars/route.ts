/**
 * Calendar API - CRUD Operations
 * RESTful endpoints for calendar management
 */

import { NextRequest, NextResponse } from 'next/server';
import * as CalendarRepo from '@/lib/repositories/calendar.repository';
import type { CreateCalendarInput } from '@/types';

// ============================================
// POST /api/calendars - Create new calendar
// ============================================
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, ...input } = body as CreateCalendarInput & { userId: string };

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        if (!input.name || !input.slug) {
            return NextResponse.json(
                { error: 'Name and slug are required' },
                { status: 400 }
            );
        }

        // Validate slug format
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(input.slug)) {
            return NextResponse.json(
                { error: 'Slug must be lowercase letters, numbers, and hyphens only' },
                { status: 400 }
            );
        }

        // Check slug availability
        const isAvailable = await CalendarRepo.isSlugAvailable(input.slug);
        if (!isAvailable) {
            return NextResponse.json(
                { error: 'This URL is already taken' },
                { status: 409 }
            );
        }

        const calendar = await CalendarRepo.create(input, userId);

        return NextResponse.json(calendar, { status: 201 });
    } catch (error) {
        console.error('[API] Calendar create error:', error);
        return NextResponse.json(
            { error: 'Failed to create calendar' },
            { status: 500 }
        );
    }
}

// ============================================
// GET /api/calendars - List user's calendars
// ============================================
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const slug = searchParams.get('slug');

        // Find by slug (public lookup)
        if (slug) {
            const calendar = await CalendarRepo.findBySlug(slug);
            if (!calendar) {
                return NextResponse.json(
                    { error: 'Calendar not found' },
                    { status: 404 }
                );
            }
            return NextResponse.json(calendar);
        }

        // Find by owner
        if (!userId) {
            return NextResponse.json(
                { error: 'userId or slug parameter required' },
                { status: 400 }
            );
        }

        const calendars = await CalendarRepo.findByOwner(userId);
        return NextResponse.json(calendars);
    } catch (error) {
        console.error('[API] Calendar list error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch calendars' },
            { status: 500 }
        );
    }
}
