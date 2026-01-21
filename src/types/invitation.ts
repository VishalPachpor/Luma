/**
 * Invitation Types
 * Production-grade type definitions for the invitation lifecycle system
 */

// ===========================================
// ENUMS
// ===========================================

/**
 * Invitation lifecycle status
 * Follows email delivery → engagement → response flow
 */
export type InvitationStatus =
    | 'pending'   // Created but not yet sent
    | 'sent'      // Email dispatched successfully
    | 'opened'    // Email opened (tracked via pixel)
    | 'clicked'   // Link clicked in email
    | 'accepted'  // Recipient accepted (RSVP'd)
    | 'declined'  // Recipient declined
    | 'bounced';  // Email delivery failed

/**
 * Source of invitation for attribution tracking
 */
export type InvitationSource =
    | 'manual'    // Single invite from UI
    | 'calendar'  // Bulk invite from calendar subscribers
    | 'import'    // CSV/contact import
    | 'csv'       // Direct CSV upload
    | 'api';      // API-based invitation

// ===========================================
// CORE INTERFACES
// ===========================================

/**
 * Invitation entity - represents a single invitation
 */
export interface Invitation {
    id: string;
    eventId: string;
    calendarId?: string;
    email: string;
    recipientName?: string;
    userId?: string;          // Linked user if they have account
    invitedBy: string;        // User ID of sender
    source: InvitationSource;
    status: InvitationStatus;

    // Tracking
    trackingToken: string;    // UUID for email pixel

    // Timestamps
    createdAt: string;
    updatedAt: string;
    sentAt?: string;
    openedAt?: string;
    clickedAt?: string;
    respondedAt?: string;

    // Extensibility
    metadata: Record<string, unknown>;
}

/**
 * Input for creating a single invitation
 */
export interface CreateInvitationInput {
    eventId: string;
    email: string;
    recipientName?: string;
    calendarId?: string;
    source?: InvitationSource;
    metadata?: Record<string, unknown>;
}

/**
 * Input for batch invitation creation
 */
export interface BatchInvitationInput {
    eventId: string;
    calendarId?: string;
    source?: InvitationSource;
    invites: Array<{
        email: string;
        name?: string;
    }>;
}

/**
 * Result of batch invitation creation
 */
export interface BatchInvitationResult {
    created: number;
    duplicates: string[];      // Emails that were already invited
    failed: string[];          // Emails that failed validation
    invitations: Invitation[]; // Successfully created invitations
}

// ===========================================
// STATISTICS & ANALYTICS
// ===========================================

/**
 * Invitation funnel statistics
 */
export interface InvitationStats {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalAccepted: number;
    totalDeclined: number;
    totalBounced: number;
    openRate: number;     // Percentage
    clickRate: number;    // Percentage
    acceptRate: number;   // Percentage
}

/**
 * Invite funnel for visualization
 */
export interface InviteFunnel {
    stage: string;
    count: number;
    percentage: number;
    color: string;
}

// ===========================================
// EVENT COUNTERS
// ===========================================

/**
 * Atomic counters stored in events.counters JSONB
 */
export interface EventCounters {
    invites_sent: number;
    invites_opened: number;
    invites_clicked: number;
    rsvp_going: number;
    rsvp_interested: number;
    checked_in: number;
    page_views: number;
}

/**
 * Event settings stored in events.settings JSONB
 */
export interface EventSettings {
    allow_guests: boolean;
    allow_plus_one: boolean;
    show_guest_list: boolean;
    auto_confirm: boolean;
    require_approval: boolean;
    max_invites_per_user: number;
}

// ===========================================
// ANALYTICS
// ===========================================

/**
 * Analytics event types
 */
export type AnalyticsMetric =
    | 'view'
    | 'share'
    | 'rsvp_start'
    | 'rsvp_complete'
    | 'checkout_start'
    | 'checkout_complete'
    | 'invite_click';

/**
 * Analytics event record
 */
export interface AnalyticsEvent {
    id: string;
    eventId: string;
    metric: AnalyticsMetric;
    value: number;
    userId?: string;
    sessionId?: string;
    referrer?: string;
    userAgent?: string;
    metadata: Record<string, unknown>;
    createdAt: string;
}

/**
 * Aggregated analytics for dashboard
 */
export interface EventAnalyticsSummary {
    eventId: string;
    totalViews: number;
    uniqueViews: number;
    totalShares: number;
    rsvpStarted: number;
    rsvpCompleted: number;
    conversionRate: number;  // rsvpCompleted / views
    checkoutStarted: number;
    checkoutCompleted: number;
    revenue: number;
}

// ===========================================
// STATE TRANSITIONS
// ===========================================

/**
 * Valid state transitions for invitations
 * Used for validation in service layer
 */
export const VALID_INVITATION_TRANSITIONS: Record<InvitationStatus, InvitationStatus[]> = {
    pending: ['sent', 'bounced'],
    sent: ['opened', 'clicked', 'accepted', 'declined', 'bounced'],
    opened: ['clicked', 'accepted', 'declined'],
    clicked: ['accepted', 'declined'],
    accepted: [],  // Terminal state
    declined: ['accepted'],  // Can change mind
    bounced: [],  // Terminal state
};

/**
 * Check if a status transition is valid
 */
export function isValidInvitationTransition(
    from: InvitationStatus,
    to: InvitationStatus
): boolean {
    return VALID_INVITATION_TRANSITIONS[from]?.includes(to) ?? false;
}
