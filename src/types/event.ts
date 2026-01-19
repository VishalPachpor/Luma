/**
 * Event Types
 * Centralized TypeScript type definitions for events
 */

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
    // Event State (Luma Architecture)
    status: 'draft' | 'published' | 'archived';
    visibility: 'public' | 'private';

    // Commerce
    ticketTiers?: import('./commerce').TicketTier[];

    requireApproval?: boolean;

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
    theme?: string;
    themeColor?: string;
    font?: string;
    endDate?: string;
}

export type CreateEventInput = Omit<Event, 'id'> & { id?: string };
export type UpdateEventInput = Partial<Omit<Event, 'id'>> & { id: string };
