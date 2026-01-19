/**
 * User Settings Service
 * Manages user preferences via Supabase 'profiles' table (preferences column)
 */

import { supabase } from '@/lib/supabase';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { UserSettings, DEFAULT_USER_SETTINGS } from '@/types/settings';

/**
 * Get user settings from Supabase
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
    if (!userId) return { ...DEFAULT_USER_SETTINGS, createdAt: new Date(), updatedAt: new Date() };

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('preferences, updated_at, created_at')
            .eq('id', userId)
            .single();

        if (error || !data) {
            return {
                ...DEFAULT_USER_SETTINGS,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }

        const typedData = data as any;
        const prefs = typedData.preferences as Partial<UserSettings> || {};

        return {
            ...DEFAULT_USER_SETTINGS,
            ...prefs,
            updatedAt: new Date(typedData.updated_at),
            createdAt: typedData.created_at ? new Date(typedData.created_at) : new Date(),
        };
    } catch (error) {
        console.error('[UserSettings] Error fetching settings:', error);
        return { ...DEFAULT_USER_SETTINGS, createdAt: new Date(), updatedAt: new Date() };
    }
}

/**
 * Update user settings
 */
export async function updateUserSettings(
    userId: string,
    updates: Partial<Omit<UserSettings, 'createdAt' | 'updatedAt'>>
): Promise<void> {
    const supabaseBrowser = createSupabaseBrowserClient();

    // Fetch current preferences to merge
    const current = await getUserSettings(userId);
    const newPreferences = {
        ...current,
        ...updates,
    };

    // Remove metadata fields from the JSON column if they exist on the type but shouldn't be nested
    // userSettings type usually mirrors the structure we want.

    await supabaseBrowser
        .from('profiles')
        .update({
            preferences: newPreferences,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);
}

/**
 * Update notification setting
 */
export async function updateNotificationSetting(
    userId: string,
    notificationType: keyof UserSettings['notifications'],
    channel: 'email' | 'whatsapp',
    enabled: boolean
): Promise<void> {
    const current = await getUserSettings(userId);
    const newNotifications = {
        ...current.notifications,
        [notificationType]: {
            ...current.notifications[notificationType],
            [channel]: enabled,
        },
    };

    return updateUserSettings(userId, { notifications: newNotifications });
}

/**
 * Update theme preference
 */
export async function updateTheme(userId: string, theme: UserSettings['theme']): Promise<void> {
    return updateUserSettings(userId, { theme });
}

/**
 * Update user profile (Meta)
 */
export async function updateProfile(
    userId: string,
    profile: Partial<UserSettings['profile']>
): Promise<void> {
    // This updates the 'profile' nested object in JSON settings, distinct from main profile columns
    // Ideally we should sync with main profile columns but for now keep backward compat with JSON shape
    const current = await getUserSettings(userId);
    const newProfile = { ...current.profile, ...profile };
    return updateUserSettings(userId, { profile: newProfile });
}
