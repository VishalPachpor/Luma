/**
 * Category Types
 * Centralized TypeScript type definitions for categories
 */

export interface Category {
    id: string;
    name: string;
    count: string;
    color: string;       // Tailwind text color class
    bgColor: string;     // Tailwind background color class
    iconName: string;    // Lucide icon name
}

export interface FeaturedCalendar {
    id: string;
    name: string;
    description: string;
    avatar: string;
    subscribers: string;
    location?: string;
}
