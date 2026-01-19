/**
 * User Settings Context
 * Production-grade context for managing user settings state
 * Features: Supabase persistence, optimistic updates, loading states, error handling
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
    UserSettings,
    DEFAULT_USER_SETTINGS,
    Theme,
    NotificationSettings
} from '@/types/settings';
import * as userSettingsService from '@/lib/services/userSettings.service';

interface UserSettingsContextType {
    // State
    settings: UserSettings | null;
    isLoading: boolean;
    error: string | null;
    isConfigured: boolean;

    // Actions
    updateTheme: (theme: Theme) => Promise<void>;
    updateNotification: (
        type: keyof NotificationSettings,
        channel: 'email' | 'whatsapp',
        enabled: boolean
    ) => Promise<void>;
    updateProfile: (profile: Partial<UserSettings['profile']>) => Promise<void>;
    refreshSettings: () => Promise<void>;
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch user settings from Firestore
     */
    const fetchSettings = useCallback(async () => {
        // Strict check for user.id to prevent 'UserId is required' error
        if (!user?.id) {
            setSettings(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const userSettings = await userSettingsService.getUserSettings(user.id);
            setSettings(userSettings);
        } catch (err) {
            console.error('Failed to fetch user settings:', err);
            setError('Failed to load settings. Please try again.');
            // Fallback to defaults for UI
            setSettings({
                ...DEFAULT_USER_SETTINGS,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Load settings when user changes
    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    /**
     * Update theme with optimistic update
     */
    const updateTheme = useCallback(async (theme: Theme) => {
        if (!user || !settings) return;

        // Optimistic update
        const previousSettings = settings;
        setSettings(prev => prev ? { ...prev, theme } : null);

        try {
            await userSettingsService.updateTheme(user.id, theme);
        } catch (err) {
            console.error('Failed to update theme:', err);
            // Rollback on error
            setSettings(previousSettings);
            setError('Failed to update theme');
        }
    }, [user, settings]);

    /**
     * Update notification setting with optimistic update
     */
    const updateNotification = useCallback(async (
        type: keyof NotificationSettings,
        channel: 'email' | 'whatsapp',
        enabled: boolean
    ) => {
        if (!user || !settings) return;

        // Optimistic update
        const previousSettings = settings;
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                notifications: {
                    ...prev.notifications,
                    [type]: {
                        ...prev.notifications[type],
                        [channel]: enabled,
                    },
                },
            };
        });

        try {
            await userSettingsService.updateNotificationSetting(user.id, type, channel, enabled);
        } catch (err) {
            console.error('Failed to update notification:', err);
            // Rollback on error
            setSettings(previousSettings);
            setError('Failed to update notification setting');
        }
    }, [user, settings]);

    /**
     * Update profile with optimistic update
     */
    const updateProfile = useCallback(async (profile: Partial<UserSettings['profile']>) => {
        if (!user || !settings) return;

        // Optimistic update
        const previousSettings = settings;
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                profile: {
                    ...prev.profile,
                    ...profile,
                },
            };
        });

        try {
            await userSettingsService.updateProfile(user.id, profile);
        } catch (err) {
            console.error('Failed to update profile:', err);
            // Rollback on error
            setSettings(previousSettings);
            setError('Failed to update profile');
        }
    }, [user, settings]);

    const value: UserSettingsContextType = {
        settings,
        isLoading,
        error,
        isConfigured: true,
        updateTheme,
        updateNotification,
        updateProfile,
        refreshSettings: fetchSettings,
    };

    return (
        <UserSettingsContext.Provider value={value}>
            {children}
        </UserSettingsContext.Provider>
    );
}

export function useUserSettings() {
    const context = useContext(UserSettingsContext);
    if (context === undefined) {
        throw new Error('useUserSettings must be used within a UserSettingsProvider');
    }
    return context;
}
