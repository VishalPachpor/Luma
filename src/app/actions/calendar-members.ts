'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export type CalendarMember = {
    id: string; // member record id
    user_id: string;
    role: 'admin' | 'member' | 'viewer';
    user: {
        id: string;
        email: string;
        display_name: string | null;
        avatar_url: string | null;
    } | null;
    added_by: string | null;
    created_at: string;
};

/**
 * Get all members for a calendar
 */
export async function getCalendarMembers(calendarId: string) {
    const supabase = await createSupabaseServerClient();

    // Fetch members with user details
    const { data, error } = await supabase
        .from('calendar_members')
        .select(`
            *,
            user:users!user_id (
                id,
                email,
                display_name,
                avatar_url
            )
        `)
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching calendar members:', error);
        // Throwing the exact message helps debugging
        throw new Error(`Failed to fetch team members: ${error.message}`);
    }

    return data as CalendarMember[];
}

/**
 * Invite a new member by email
 */
export async function inviteCalendarMember(calendarId: string, email: string, role: 'admin' | 'member' = 'admin') {
    const supabase = await createSupabaseServerClient();

    // Normalize email to prevent case-sensitivity issues
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if user exists
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .ilike('email', normalizedEmail)
        .single();

    if (userError || !user) {
        // Debug log
        console.log(`User query failed for email: ${normalizedEmail}`, userError);
        return {
            success: false,
            message: `User with email '${normalizedEmail}' not found. They must sign up for PlanX first to be added.`
        };
    }

    // 2. Check if already a member
    const { data: existing } = await supabase
        .from('calendar_members')
        .select('id')
        .eq('calendar_id', calendarId)
        .eq('user_id', user.id)
        .single();

    if (existing) {
        return {
            success: false,
            message: 'User is already a member of this calendar.'
        };
    }

    // 3. Add member
    const { error: insertError } = await supabase
        .from('calendar_members')
        .insert({
            calendar_id: calendarId,
            user_id: user.id,
            role: role,
        });

    if (insertError) {
        console.error('Error adding member:', insertError);
        return {
            success: false,
            message: `Failed to add member: ${insertError.message}`
        };
    }

    revalidatePath(`/calendar/${calendarId}/manage/settings/admins`);
    return { success: true, message: 'Member added successfully' };
}

/**
 * Remove a member from the calendar
 */
export async function removeCalendarMember(calendarId: string, userId: string) {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
        .from('calendar_members')
        .delete()
        .eq('calendar_id', calendarId)
        .eq('user_id', userId);

    if (error) {
        console.error('Error removing member:', error);
        return { success: false, message: 'Failed to remove member' };
    }

    revalidatePath(`/calendar/${calendarId}/manage/settings/admins`);
    return { success: true };
}
