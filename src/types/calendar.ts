/**
 * Calendar Types
 * TypeScript definitions for Calendar entity and subscriptions
 */

// ============================================
// Core Calendar Entity
// ============================================

/** Allowed branding colors for calendars */
export type CalendarColor =
    | 'slate'
    | 'pink'
    | 'purple'
    | 'indigo'
    | 'blue'
    | 'green'
    | 'yellow'
    | 'orange'
    | 'red';

/** Calendar entity representing a subscribable event feed */
export interface Calendar {
    id: string;
    ownerId: string;

    // Basic info
    name: string;
    slug: string;
    description?: string;

    // Branding
    color: CalendarColor;
    avatarUrl?: string;
    coverUrl?: string;

    // Location
    location?: string;
    latitude?: number;
    longitude?: number;
    isGlobal: boolean;

    // Stats
    subscriberCount: number;
    eventCount: number;

    // Visibility
    isPrivate: boolean;

    // Timestamps
    createdAt: string;
    updatedAt: string;
}

// ============================================
// Input Types
// ============================================

/** Input for creating a new calendar */
export interface CreateCalendarInput {
    name: string;
    slug: string;
    description?: string;
    color?: CalendarColor;
    avatarUrl?: string;
    coverUrl?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    isGlobal?: boolean;
    isPrivate?: boolean;
}

/** Input for updating a calendar */
export type UpdateCalendarInput = Partial<CreateCalendarInput>;

// ============================================
// Subscription Types
// ============================================

/** Subscription relationship between user and calendar */
export interface CalendarSubscription {
    id: string;
    calendarId: string;
    userId: string;
    notifyNewEvents: boolean;
    notifyReminders: boolean;
    createdAt: string;
}

/** Input for creating a subscription */
export interface CreateSubscriptionInput {
    calendarId: string;
    notifyNewEvents?: boolean;
    notifyReminders?: boolean;
}

// ============================================
// Utility Types
// ============================================

/** Calendar with owner information populated */
export interface CalendarWithOwner extends Calendar {
    owner: {
        id: string;
        name: string;
        avatarUrl?: string;
    };
}

/** Subscription with calendar details populated */
export interface SubscriptionWithCalendar extends CalendarSubscription {
    calendar: Calendar;
}
