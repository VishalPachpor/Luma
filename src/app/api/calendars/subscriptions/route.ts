/**
 * Calendar Subscriptions API
 * List user's subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import * as CalendarRepo from '@/lib/repositories/calendar.repository';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId parameter required' },
                { status: 400 }
            );
        }

        const calendars = await CalendarRepo.findSubscriptions(userId);
        return NextResponse.json(calendars);
    } catch (error) {
        console.error('[API] Subscription list error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscriptions' },
            { status: 500 }
        );
    }
}
