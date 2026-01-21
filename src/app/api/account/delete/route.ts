/**
 * Account Delete API Route
 * Uses Supabase Admin client to delete user account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const supabase = getServiceSupabase();

        // Delete user data from related tables first
        // Order matters due to foreign key constraints

        // Delete from guests
        await supabase.from('guests').delete().eq('user_id', userId);

        // Delete from rsvps
        await supabase.from('rsvps').delete().eq('user_id', userId);

        // Delete from calendar_subscriptions
        await supabase.from('calendar_subscriptions').delete().eq('user_id', userId);

        // Delete user's events
        await supabase.from('events').delete().eq('organizer_id', userId);

        // Delete user's calendars
        await supabase.from('calendars').delete().eq('owner_id', userId);

        // Delete from profiles
        await supabase.from('profiles').delete().eq('id', userId);

        // Finally, delete the auth user
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);

        if (authError) {
            console.error('Failed to delete auth user:', authError);
            return NextResponse.json(
                { error: 'Failed to delete account' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Account deletion error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
