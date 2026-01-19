/**
 * Categories API Route
 * RESTful API endpoint for categories
 */

import { NextRequest, NextResponse } from 'next/server';
import * as categoryRepo from '@/lib/repositories/category.repository';

/**
 * GET /api/categories
 * Get all categories and featured calendars
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const featured = searchParams.get('featured');

        if (featured === 'true') {
            const calendars = await categoryRepo.findAllFeaturedCalendars();
            return NextResponse.json({ calendars, count: calendars.length });
        }

        const categories = await categoryRepo.findAllCategories();
        return NextResponse.json({ categories, count: categories.length });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}
