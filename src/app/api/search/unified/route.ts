/**
 * Unified Search API
 * 
 * GET /api/search/unified
 * Cross-entity search with command palette support
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { unifiedSearch, getQuickActions, SearchContext } from '@/lib/search/unified-search';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    // Optional auth for personalized results
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let userId: string | undefined;

    if (token) {
        const supabase = getServiceSupabase();
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
    }

    const context: SearchContext = {
        userId,
        currentPage: searchParams.get('page') || undefined,
    };

    try {
        // If no query, return quick actions
        if (!query.trim()) {
            const actions = getQuickActions(context);
            return NextResponse.json({
                results: actions,
                query: '',
                source: 'commands',
                processingTimeMs: 0,
            });
        }

        // Unified search
        const response = await unifiedSearch(query, context);

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('[UnifiedSearchAPI] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
