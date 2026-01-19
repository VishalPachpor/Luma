/**
 * Event Visibility API
 * PATCH /api/events/[id]/visibility
 * Updates the visibility of an event (public/private)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { visibility } = body;

        if (!visibility || !['public', 'private'].includes(visibility)) {
            return NextResponse.json(
                { error: 'Invalid visibility value. Must be "public" or "private".' },
                { status: 400 }
            );
        }

        // Use Supabase to update the event
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from('events')
            .update({
                visibility,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Visibility API] Supabase error:', error);
            return NextResponse.json(
                { error: 'Failed to update visibility' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            visibility: data.visibility
        });

    } catch (error) {
        console.error('[Visibility API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
