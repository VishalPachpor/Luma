/**
 * Category Repository
 * Data access layer for categories
 * Ready for Next.js 16 caching when cacheComponents is enabled
 */

import type { Category, FeaturedCalendar } from '@/types';
import * as calendarRepo from '@/lib/repositories/calendar.repository';

// Mock categories data
const mockCategories: Category[] = [
    { id: '1', name: 'Tech', count: '3K Events', color: 'text-orange-400', bgColor: 'bg-orange-400/10', iconName: 'Cpu' },
    { id: '2', name: 'Food & Drink', count: '5 Events', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', iconName: 'Utensils' },
    { id: '3', name: 'AI', count: '2K Events', color: 'text-pink-500', bgColor: 'bg-pink-500/10', iconName: 'BrainCircuit' },
    { id: '4', name: 'Arts & Culture', count: '878 Events', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', iconName: 'Palette' },
    { id: '5', name: 'Climate', count: '344 Events', color: 'text-green-400', bgColor: 'bg-green-400/10', iconName: 'Leaf' },
    { id: '6', name: 'Fitness', count: '858 Events', color: 'text-orange-500', bgColor: 'bg-orange-500/10', iconName: 'Dumbbell' },
    { id: '7', name: 'Wellness', count: '1K Events', color: 'text-teal-400', bgColor: 'bg-teal-400/10', iconName: 'Sparkles' },
    { id: '8', name: 'Crypto', count: '552 Events', color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', iconName: 'Bitcoin' },
];



/**
 * Get all categories
 */
export async function findAllCategories(): Promise<Category[]> {
    return mockCategories;
}

/**
 * Get category by ID
 */
export async function findCategoryById(id: string): Promise<Category | null> {
    return mockCategories.find((c) => c.id === id) ?? null;
}



/**
 * Get all featured calendars (popular from DB)
 */
export async function findAllFeaturedCalendars(): Promise<FeaturedCalendar[]> {
    try {
        const calendars = await calendarRepo.findPopular(6);
        return calendars.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description || '',
            avatar: c.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`,
            subscribers: `${c.subscriberCount} Subscribers`, // Format matching UI expect
            location: c.location
        }));
    } catch (error) {
        console.error('Failed to fetch featured calendars:', error);
        return [];
    }
}
