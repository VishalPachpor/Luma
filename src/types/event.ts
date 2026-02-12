/**
 * Event Types
 * Centralized TypeScript type definitions for events
 */

/**
 * Event Lifecycle States
 * 
 * Valid transitions:
 *   draft → published
 *   published → live (automatic at event time)
 *   published → draft (revert to edit)
 *   live → ended (automatic at end time)
 *   ended → archived
 */
export type EventStatus =
    | 'draft'      // Being created, not visible to public
    | 'published'  // Open for registration, visible
    | 'live'       // Event is happening now
    | 'ended'      // Event completed, no more check-ins
    | 'archived';  // Historical, hidden from listings

/**
 * Event Lifecycle Metadata
 * Tracks timing and transition history
 */
export interface EventLifecycle {
    scheduledStartAt?: string;  // When event goes live
    scheduledEndAt?: string;    // When event ends
    transitionedAt?: string;    // Last transition timestamp
    previousStatus?: EventStatus;
}

export interface Coordinates {
    lat: number;
    lng: number;
}

export type QuestionType = 'short_text' | 'long_text' | 'single_select' | 'multi_select' | 'wallet_address' | 'twitter' | 'telegram';

export interface RegistrationQuestion {
    id: string;
    type: QuestionType;
    label: string;
    required: boolean;
    placeholder?: string;
    options?: string[]; // For select types
}

export interface Event {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    city: string;
    coords: Coordinates;
    coverImage: string;
    attendees: number;
    tags: string[];
    organizer: string;
    organizerId?: string;
    calendarId?: string;
    capacity?: number;
    price?: number;
    // Event State (Lifecycle)
    status: EventStatus;
    visibility: 'public' | 'private';
    // Lifecycle metadata
    lifecycle?: EventLifecycle;

    requireApproval?: boolean;

    // Staking
    requireStake?: boolean;
    stakeAmount?: number;
    organizerWallet?: string; // Ethereum wallet address for stake payments

    // Custom Registration
    registrationQuestions?: RegistrationQuestion[];

    // Meta fields
    createdAt?: string;
    updatedAt?: string;

    // Rich content fields
    socialLinks?: {
        website?: string;
        twitter?: string;
        telegram?: string;
        discord?: string;
        instagram?: string;
    };
    agenda?: { title: string; description: string; time?: string }[];
    hosts?: { name: string; description?: string; icon?: string; role?: string }[];
    whoShouldAttend?: string[];
    eventFormat?: { icon: string; title: string; description?: string }[];
    presentedBy?: string;
    about?: string[]; // Array of paragraphs

    // Appearance & Settings
    settings?: any;
    theme?: string;
    themeColor?: string;
    font?: string;
    endDate?: string;

    // Commerce
    ticketTiers?: import('./commerce').TicketTier[];
}

export type CreateEventInput = Omit<Event, 'id'> & { id?: string };
export type UpdateEventInput = Partial<Omit<Event, 'id'>> & { id: string };
