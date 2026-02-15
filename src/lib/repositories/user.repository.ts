/**
 * User Repository
 * Data access layer for users
 * Persists user profiles to Supabase profiles table
 */

import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

/**
 * Get user by ID (Public Profile)
 */
export async function findById(id: string): Promise<User | null> {
    if (!id) return null;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            name: data.display_name || '',
            email: data.email || '',
            avatar: data.avatar_url || '',
            coverImage: data.cover_image, // Map cover_image
            role: 'user', // Default role for now
            bio: data.bio || '',
            website: data.website || '',
            twitterHandle: data.twitter_handle || '',
            location: data.location || '',
            joinedAt: data.created_at,
            subscriberCount: 0 // Placeholder until we link to subscriptions
        };
    } catch (error) {
        console.error('[UserRepo] Error fetching user:', error);
        return null;
    }
}

/**
 * Update user profile
 */
export async function update(id: string, updates: Partial<User>): Promise<User | null> {
    const { data, error } = await supabase
        .from('profiles')
        .update({
            display_name: updates.name,
            bio: updates.bio,
            location: updates.location,
            website: updates.website,
            cover_image: updates.coverImage,
            avatar_url: updates.avatar,
            twitter_handle: updates.twitterHandle
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[UserRepo] Error updating user:', error);
        throw error;
    }

    if (!data) return null;

    return {
        id: data.id,
        name: data.display_name || '',
        email: data.email || '',
        avatar: data.avatar_url || '',
        coverImage: data.cover_image,
        role: 'user',
        bio: data.bio || '',
        website: data.website || '',
        twitterHandle: data.twitter_handle || '',
        location: data.location || '',
        joinedAt: data.created_at,
        subscriberCount: 0
    };
}

/**
 * Sync Auth user to Profiles (Update on login)
 */
export async function syncUser(authUser: any): Promise<User> {
    // Supabase handles profile creation via triggers usually.
    // This function ensures client-side metadata is up to date if needed.

    // For now, we assume the user exists or is handled by triggers.
    // We just return the profile.
    const profile = await findById(authUser.id);
    if (profile) return profile;

    // If no profile (trigger failed/delayed), we might want to return a transient user object
    return {
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        avatar: authUser.user_metadata?.avatar_url || '',
        role: 'user',
        joinedAt: new Date().toISOString()
    };
}

/**
 * Update user profile
 */
export async function updateProfile(id: string, updates: Partial<User>): Promise<void> {
    const { createSupabaseBrowserClient } = await import('@/lib/supabase-browser');
    const supabaseBrowser = createSupabaseBrowserClient();

    const supabaseUpdates: any = {};
    if (updates.name) supabaseUpdates.display_name = updates.name;
    if (updates.bio) supabaseUpdates.bio = updates.bio;
    if (updates.location) supabaseUpdates.location = updates.location;
    if (updates.website) supabaseUpdates.website = updates.website;
    if (updates.twitterHandle) supabaseUpdates.twitter_handle = updates.twitterHandle;
    if (updates.avatar) supabaseUpdates.avatar_url = updates.avatar;

    try {
        const { error } = await supabaseBrowser
            .from('profiles')
            .update(supabaseUpdates)
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('[UserRepo] Error updating profile:', error);
        throw error;
    }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
    return null;
}
