/**
 * Category Types
 * Centralized TypeScript type definitions for categories
 */

export interface Category {
    id: string;
    name: string;
    slug: string;
    iconName: string;    // Lucide icon name (e.g., 'Cpu', 'BrainCircuit')
    color: string;       // Tailwind text color class
    bgColor: string;     // Tailwind background color class
    displayOrder: number;
    isActive: boolean;
    eventCount: number;  // Dynamic count from database
}

// Legacy alias for backward compatibility during transition
export interface CategoryDisplay extends Category {
    count: string;  // Formatted string like "3K Events"
}

export interface FeaturedCalendar {
    id: string;
    name: string;
    description: string;
    avatar: string;
    subscribers: string;
    location?: string;
}

