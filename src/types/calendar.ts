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

// ============================================
// Calendar People (Audience CRM)
// ============================================

/** Source of how a person was added to the calendar */
export type PersonSource = 'event' | 'newsletter' | 'import' | 'follow';

/** A person in the calendar's audience */
export interface CalendarPerson {
    id: string;
    calendarId: string;

    // Identity
    email: string;
    name?: string;
    avatarUrl?: string;

    // Acquisition
    source: PersonSource;
    sourceEventId?: string;
    joinedAt: string;

    // Engagement
    eventsAttended: number;
    lastEventAt?: string;

    // Newsletter status
    subscribed: boolean;
    unsubscribedAt?: string;

    // Segmentation
    tags?: string[];

    // Timestamps
    createdAt: string;
    updatedAt: string;
}

/** Input for adding a person to a calendar */
export interface AddCalendarPersonInput {
    email: string;
    name?: string;
    source?: PersonSource;
    sourceEventId?: string;
    tags?: string[];
}

// ============================================
// Calendar Insights (Analytics)
// ============================================

/** Pre-computed analytics for a calendar */
export interface CalendarInsights {
    calendarId: string;

    // Lifetime totals
    totalEvents: number;
    totalTicketsSold: number;
    totalSubscribers: number;
    totalRevenue: number;

    // Weekly trends (for "X this week" display)
    eventsThisWeek: number;
    ticketsThisWeek: number;
    subscribersThisWeek: number;
    revenueThisWeek: number;

    // Feedback
    avgRating?: number;
    totalFeedbackCount: number;

    updatedAt: string;
}

// ============================================
// Coupons (Discounts)
// ============================================

/** Discount type */
export type CouponType = 'percent' | 'fixed';

/** Calendar-level coupon for tickets */
export interface Coupon {
    id: string;
    calendarId: string;

    code: string;
    type: CouponType;
    value: number;

    // Limits
    maxUses?: number;
    usedCount: number;

    // Validity
    startsAt?: string;
    expiresAt?: string;

    // Scope
    applicableEventIds?: string[];
    minOrderAmount?: number;

    // Status
    active: boolean;

    createdAt: string;
    updatedAt: string;
}

/** Input for creating a coupon */
export interface CreateCouponInput {
    code: string;
    type: CouponType;
    value: number;
    maxUses?: number;
    startsAt?: string;
    expiresAt?: string;
    applicableEventIds?: string[];
    minOrderAmount?: number;
}

/** Coupon validation result */
export interface CouponValidation {
    isValid: boolean;
    couponId?: string;
    discountType?: CouponType;
    discountValue?: number;
    errorMessage?: string;
}
