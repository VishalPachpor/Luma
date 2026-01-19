/**
 * User Settings Service
 * Production-grade service for CRUD operations on user settings
 * Uses Firestore for persistence with proper error handling
 */

import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { UserSettings, DEFAULT_USER_SETTINGS } from '@/types/settings';

const USERS_COLLECTION = 'users';
const SETTINGS_SUBCOLLECTION = 'settings';
const SETTINGS_DOC_ID = 'preferences';

/**
 * Convert Firestore timestamps to Date objects
 */
function convertTimestamps(data: Record<string, unknown>): UserSettings {
    return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    } as UserSettings;
}

/**
 * Get user settings from Firestore
 * Creates default settings if none exist
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
    if (!db || !isFirebaseConfigured) {
        // Fallback gracefully instead of causing app crash loop
        console.warn('[UserSettings] Firebase not configured, returning defaults');
        return {
            ...DEFAULT_USER_SETTINGS,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }

    // Capture db locally to satisfy TypeScript null checks since 'db' is a mutable export
    const firestore = db;

    if (!userId) {
        console.warn('[UserSettings] getUserSettings called without userId');
        throw new Error('UserId is required');
    }

    console.log('[UserSettings] Fetching settings for user:', userId);

    try {
        const settingsRef = doc(firestore, USERS_COLLECTION, userId, SETTINGS_SUBCOLLECTION, SETTINGS_DOC_ID);
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
            console.log('[UserSettings] Found existing settings');
            return convertTimestamps(settingsSnap.data());
        }

        console.log('[UserSettings] No settings found, creating defaults...');

        // Create default settings for new user
        const newSettings: UserSettings = {
            ...DEFAULT_USER_SETTINGS,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await setDoc(settingsRef, {
            ...newSettings,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        console.log('[UserSettings] Created default settings');
        return newSettings;
    } catch (error) {
        console.error('[UserSettings] Error fetching/creating settings:', error);
        // Return defaults on error to prevent app crash
        return {
            ...DEFAULT_USER_SETTINGS,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
}

/**
 * Update user settings in Firestore
 * Uses setDoc with merge for robustness (creates doc if missing)
 */
export async function updateUserSettings(
    userId: string,
    updates: Partial<Omit<UserSettings, 'createdAt' | 'updatedAt'>>
): Promise<void> {
    if (!db || !isFirebaseConfigured) {
        throw new Error('Firebase not configured');
    }

    const settingsRef = doc(db, USERS_COLLECTION, userId, SETTINGS_SUBCOLLECTION, SETTINGS_DOC_ID);

    // Use setDoc with merge to handle both create and update
    await setDoc(settingsRef, {
        ...updates,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

/**
 * Update a specific notification setting
 */
export async function updateNotificationSetting(
    userId: string,
    notificationType: keyof UserSettings['notifications'],
    channel: 'email' | 'whatsapp',
    enabled: boolean
): Promise<void> {
    if (!db || !isFirebaseConfigured) {
        throw new Error('Firebase not configured');
    }

    const settingsRef = doc(db, USERS_COLLECTION, userId, SETTINGS_SUBCOLLECTION, SETTINGS_DOC_ID);

    // Use setDoc with merge for robustness
    await setDoc(settingsRef, {
        notifications: {
            [notificationType]: {
                [channel]: enabled,
            },
        },
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

/**
 * Update theme preference
 */
export async function updateTheme(userId: string, theme: UserSettings['theme']): Promise<void> {
    return updateUserSettings(userId, { theme });
}

/**
 * Update user profile
 */
export async function updateProfile(
    userId: string,
    profile: Partial<UserSettings['profile']>
): Promise<void> {
    if (!db || !isFirebaseConfigured) {
        throw new Error('Firebase not configured');
    }

    const settingsRef = doc(db, USERS_COLLECTION, userId, SETTINGS_SUBCOLLECTION, SETTINGS_DOC_ID);

    // Use setDoc with merge for robustness
    await setDoc(settingsRef, {
        profile,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}
