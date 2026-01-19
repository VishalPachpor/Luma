/**
 * User Settings Types
 * Production-grade type definitions for user settings persistence
 */

export type Theme = 'system' | 'light' | 'dark';

export interface NotificationChannel {
    email: boolean;
    whatsapp: boolean;
}

export interface NotificationSettings {
    // Events You Attend
    eventInvites: NotificationChannel;
    eventReminders: NotificationChannel;
    eventBlasts: NotificationChannel;
    eventUpdates: NotificationChannel;
    feedbackRequests: NotificationChannel;
    // Events You Host
    guestRegistrations: NotificationChannel;
    feedbackResponses: NotificationChannel;
    // Calendars You Manage
    newMembers: NotificationChannel;
    eventSubmissions: NotificationChannel;
    // Platform
    productUpdates: NotificationChannel;
}

export interface SocialLinks {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
    linkedin?: string;
    website?: string;
}

export interface UserProfile {
    firstName: string;
    lastName: string;
    username: string;
    bio: string;
    avatarUrl?: string;
    socialLinks: SocialLinks;
}

export interface UserSettings {
    // Display preferences
    theme: Theme;
    language: string;
    // Notification settings
    notifications: NotificationSettings;
    // Profile data (separate from Firebase Auth profile)
    profile: UserProfile;
    // Metadata
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Default settings for new users
 */
export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'createdAt' | 'updatedAt'> = {
    theme: 'dark',
    language: 'en',
    notifications: {
        eventInvites: { email: true, whatsapp: true },
        eventReminders: { email: true, whatsapp: true },
        eventBlasts: { email: true, whatsapp: false },
        eventUpdates: { email: true, whatsapp: false },
        feedbackRequests: { email: true, whatsapp: false },
        guestRegistrations: { email: true, whatsapp: false },
        feedbackResponses: { email: true, whatsapp: false },
        newMembers: { email: true, whatsapp: false },
        eventSubmissions: { email: true, whatsapp: false },
        productUpdates: { email: true, whatsapp: false },
    },
    profile: {
        firstName: '',
        lastName: '',
        username: '',
        bio: '',
        socialLinks: {},
    },
};
