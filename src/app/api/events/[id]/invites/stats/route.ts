/**
 * API Route: Get Event Invite Stats
 * 
 * GET /api/events/[id]/invites/stats
 * Returns invite funnel statistics (sent, opened, clicked, accepted)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as invitationRepo from '@/lib/repositories/invitation.repository';
import type { Database } from '@/types/database.types';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: eventId } = await params;

        // Verify authorization
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user can manage this event
        const { data: event } = await (supabase
            .from('events') as any)
            .select('organizer_id')
            .eq('id', eventId)
            .single() as { data: { organizer_id: string } | null; error: any };

        if (!event || event.organizer_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch stats
        const stats = await invitationRepo.getStats(eventId);

        if (!stats) {
            return NextResponse.json({
                stats: {
                    totalSent: 0,
                    totalOpened: 0,
                    totalClicked: 0,
                    totalAccepted: 0,
                    totalDeclined: 0,
                    totalBounced: 0,
                    openRate: 0,
                    clickRate: 0,
                    acceptRate: 0,
                }
            });
        }

        return NextResponse.json({ stats });

    } catch (error) {
        console.error('[API] Get invite stats error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
