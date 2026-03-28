/**
 * Account Delete API Route
 * Uses Supabase Admin client to delete user account.
 * Requires authenticated user — can only delete own account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const supabase = getServiceSupabase();

        // 1. Authenticate the caller
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Verify the userId in the body matches the authenticated user
        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }
        if (userId !== user.id) {
            return NextResponse.json({ error: 'Forbidden: can only delete your own account' }, { status: 403 });
        }

        // 3. Delete related data (order matters for FK constraints)
        const deleteSteps = [
            supabase.from('guests').delete().eq('user_id', userId),
            supabase.from('rsvps').delete().eq('user_id', userId),
            supabase.from('calendar_subscriptions').delete().eq('user_id', userId),
        ];

        for (const step of deleteSteps) {
            const { error } = await step;
            if (error) console.error('[AccountDelete] Non-fatal delete error:', error.message);
        }

        // Events and calendars must be handled carefully (they have guests/events under them)
        await supabase.from('events').delete().eq('organizer_id', userId);
        await supabase.from('calendars').delete().eq('owner_id', userId);
        await supabase.from('profiles').delete().eq('id', userId);

        // 4. Delete the auth user last
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
        if (authDeleteError) {
            console.error('[AccountDelete] Failed to delete auth user:', authDeleteError);
            return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[AccountDelete] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
