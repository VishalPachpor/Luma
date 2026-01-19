/**
 * Calendar API - Single Calendar Operations
 * GET, PUT, DELETE for individual calendars
 */

import { NextRequest, NextResponse } from 'next/server';
import * as CalendarRepo from '@/lib/repositories/calendar.repository';
import type { UpdateCalendarInput } from '@/types';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// ============================================
// GET /api/calendars/[id] - Get calendar by ID
// ============================================
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const calendar = await CalendarRepo.findById(id);

        if (!calendar) {
            return NextResponse.json(
                { error: 'Calendar not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(calendar);
    } catch (error) {
        console.error('[API] Calendar get error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch calendar' },
            { status: 500 }
        );
    }
}

// ============================================
// PUT /api/calendars/[id] - Update calendar
// ============================================
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { userId, ...updates } = body as UpdateCalendarInput & { userId: string };

        // Get existing calendar to check ownership
        const existing = await CalendarRepo.findById(id);
        if (!existing) {
            return NextResponse.json(
                { error: 'Calendar not found' },
                { status: 404 }
            );
        }

        if (existing.ownerId !== userId) {
            return NextResponse.json(
                { error: 'You do not have permission to update this calendar' },
                { status: 403 }
            );
        }

        // If slug is being changed, check availability
        if (updates.slug && updates.slug !== existing.slug) {
            const isAvailable = await CalendarRepo.isSlugAvailable(updates.slug);
            if (!isAvailable) {
                return NextResponse.json(
                    { error: 'This URL is already taken' },
                    { status: 409 }
                );
            }
        }

        const updated = await CalendarRepo.update(id, updates);
        return NextResponse.json(updated);
    } catch (error) {
        console.error('[API] Calendar update error:', error);
        return NextResponse.json(
            { error: 'Failed to update calendar' },
            { status: 500 }
        );
    }
}

// ============================================
// DELETE /api/calendars/[id] - Delete calendar
// ============================================
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        // Get existing calendar to check ownership
        const existing = await CalendarRepo.findById(id);
        if (!existing) {
            return NextResponse.json(
                { error: 'Calendar not found' },
                { status: 404 }
            );
        }

        if (existing.ownerId !== userId) {
            return NextResponse.json(
                { error: 'You do not have permission to delete this calendar' },
                { status: 403 }
            );
        }

        await CalendarRepo.remove(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Calendar delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete calendar' },
            { status: 500 }
        );
    }
}
