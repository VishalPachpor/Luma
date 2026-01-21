/**
 * API Route: Get Event Invitations
 * 
 * GET /api/events/[id]/invites
 * Returns list of sent invitations for an event with lifecycle status
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

        // Get pagination params
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const status = url.searchParams.get('status') as any;

        // Fetch invitations
        const result = await invitationRepo.findByEvent(eventId, { limit, offset, status });

        // Transform for frontend
        const invitations = result.invitations.map(inv => ({
            id: inv.id,
            email: inv.email,
            recipientName: inv.recipientName,
            status: inv.status,
            sentAt: inv.sentAt,
            openedAt: inv.openedAt,
            clickedAt: inv.clickedAt,
            createdAt: inv.createdAt,
        }));

        return NextResponse.json({
            invitations,
            total: result.total,
            limit,
            offset,
        });

    } catch (error) {
        console.error('[API] Get invites error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
