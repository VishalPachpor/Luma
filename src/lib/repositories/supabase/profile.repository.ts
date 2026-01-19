/**
 * Supabase Profile Repository
 * Handles user profile operations
 */

import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export interface Profile {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    twitterHandle: string | null;
    createdAt: string;
    updatedAt: string;
}

const supabase = createSupabaseBrowserClient();

function rowToProfile(row: any): Profile {
    return {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        bio: row.bio,
        location: row.location,
        website: row.website,
        twitterHandle: row.twitter_handle,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * Get profile by ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('[ProfileRepo] Get profile failed:', error);
        return null;
    }

    return data ? rowToProfile(data) : null;
}

/**
 * Update profile
 */
export async function updateProfile(
    userId: string,
    updates: Partial<Omit<Profile, 'id' | 'email' | 'createdAt' | 'updatedAt'>>
): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .update({
            display_name: updates.displayName,
            avatar_url: updates.avatarUrl,
            bio: updates.bio,
            location: updates.location,
            website: updates.website,
            twitter_handle: updates.twitterHandle,
        })
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('[ProfileRepo] Update profile failed:', error);
        return null;
    }

    return data ? rowToProfile(data) : null;
}

/**
 * Get multiple profiles by IDs
 */
export async function getProfiles(userIds: string[]): Promise<Profile[]> {
    if (userIds.length === 0) return [];

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

    if (error) {
        console.error('[ProfileRepo] Get profiles failed:', error);
        return [];
    }

    return (data || []).map(rowToProfile);
}

export const profileRepository = {
    getProfile,
    updateProfile,
    getProfiles,
};
