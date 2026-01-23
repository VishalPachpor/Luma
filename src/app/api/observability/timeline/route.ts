/**
 * Timeline API
 * 
 * GET /api/observability/timeline
 * Query entity timelines and transaction traces
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import {
    getEntityTimeline,
    getTransactionTimeline,
    getRecentEvents,
    getIncompleteTransactions,
} from '@/lib/observability/timeline.service';

export async function GET(request: NextRequest) {
    const supabase = getServiceSupabase();
    const searchParams = request.nextUrl.searchParams;

    // Auth check
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Query type
    const type = searchParams.get('type'); // 'entity' | 'transaction' | 'recent' | 'incomplete'

    try {
        if (type === 'entity') {
            const entityType = searchParams.get('entityType') as 'event' | 'ticket' | 'payment';
            const entityId = searchParams.get('entityId');

            if (!entityType || !entityId) {
                return NextResponse.json({ error: 'entityType and entityId required' }, { status: 400 });
            }

            const timeline = await getEntityTimeline(entityType, entityId);
            return NextResponse.json({ timeline });
        }

        if (type === 'transaction') {
            const correlationId = searchParams.get('correlationId');

            if (!correlationId) {
                return NextResponse.json({ error: 'correlationId required' }, { status: 400 });
            }

            const events = await getTransactionTimeline(correlationId);
            return NextResponse.json({ events });
        }

        if (type === 'recent') {
            const limit = parseInt(searchParams.get('limit') || '100', 10);
            const eventTypes = searchParams.get('eventTypes')?.split(',');

            const events = await getRecentEvents(limit, eventTypes);
            return NextResponse.json({ events });
        }

        if (type === 'incomplete') {
            const hours = parseInt(searchParams.get('hours') || '24', 10);
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);

            const incomplete = await getIncompleteTransactions(since);
            return NextResponse.json({ incomplete });
        }

        return NextResponse.json({ error: 'Invalid type. Use: entity, transaction, recent, incomplete' }, { status: 400 });

    } catch (error: any) {
        console.error('[TimelineAPI] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
