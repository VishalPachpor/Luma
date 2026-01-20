/**
 * Category Repository
 * Data access layer for categories - fetches from Supabase
 * Uses categories_with_counts view for dynamic event counts
 */

import type { Category, FeaturedCalendar } from '@/types';
import { supabase } from '@/lib/supabase';
import * as calendarRepo from '@/lib/repositories/calendar.repository';

// Database row type from categories_with_counts view
interface CategoryRow {
    id: string;
    name: string;
    slug: string;
    icon_name: string;
    color: string;
    bg_color: string;
    display_order: number;
    is_active: boolean;
    event_count: number;
}

/**
 * Format event count for display (e.g., 1500 -> "1.5K Events")
 */
function formatEventCount(count: number): string {
    if (count >= 1000) {
        const k = count / 1000;
        return k % 1 === 0 ? `${k}K Events` : `${k.toFixed(1)}K Events`;
    }
    return `${count} ${count === 1 ? 'Event' : 'Events'}`;
}

/**
 * Map database row to Category domain object
 */
function mapRowToCategory(row: CategoryRow): Category {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        iconName: row.icon_name,
        color: row.color,
        bgColor: row.bg_color,
        displayOrder: row.display_order,
        isActive: row.is_active,
        eventCount: row.event_count,
    };
}

// Fallback mock categories for when database is not yet set up
const FALLBACK_CATEGORIES: Category[] = [
    { id: 'tech', name: 'Tech', slug: 'tech', iconName: 'Cpu', color: 'text-orange-400', bgColor: 'bg-orange-400/10', displayOrder: 1, isActive: true, eventCount: 2400 },
    { id: 'food', name: 'Food & Drink', slug: 'food-drink', iconName: 'Utensils', color: 'text-red-400', bgColor: 'bg-red-400/10', displayOrder: 2, isActive: true, eventCount: 1800 },
    { id: 'ai', name: 'AI', slug: 'ai', iconName: 'BrainCircuit', color: 'text-purple-400', bgColor: 'bg-purple-400/10', displayOrder: 3, isActive: true, eventCount: 890 },
    { id: 'arts', name: 'Arts & Culture', slug: 'arts-culture', iconName: 'Palette', color: 'text-pink-400', bgColor: 'bg-pink-400/10', displayOrder: 4, isActive: true, eventCount: 1200 },
    { id: 'climate', name: 'Climate', slug: 'climate', iconName: 'Leaf', color: 'text-green-400', bgColor: 'bg-green-400/10', displayOrder: 5, isActive: true, eventCount: 450 },
    { id: 'fitness', name: 'Fitness', slug: 'fitness', iconName: 'Dumbbell', color: 'text-blue-400', bgColor: 'bg-blue-400/10', displayOrder: 6, isActive: true, eventCount: 780 },
    { id: 'wellness', name: 'Wellness', slug: 'wellness', iconName: 'Sparkles', color: 'text-amber-400', bgColor: 'bg-amber-400/10', displayOrder: 7, isActive: true, eventCount: 340 },
    { id: 'crypto', name: 'Crypto', slug: 'crypto', iconName: 'Bitcoin', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', displayOrder: 8, isActive: true, eventCount: 560 },
];

/**
 * Get all active categories with event counts
 */
export async function findAllCategories(): Promise<Category[]> {
    try {
        const { data, error } = await supabase
            .from('categories_with_counts')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (error) {
            console.error('Failed to fetch categories from DB, using fallback:', error.message);
            return FALLBACK_CATEGORIES;
        }

        // If database returns empty, use fallback
        if (!data || data.length === 0) {
            console.log('No categories in DB, using fallback data');
            return FALLBACK_CATEGORIES;
        }

        return data.map(mapRowToCategory);
    } catch (err) {
        console.error('Category fetch error, using fallback:', err);
        return FALLBACK_CATEGORIES;
    }
}

/**
 * Get category by ID
 */
export async function findCategoryById(id: string): Promise<Category | null> {
    const { data, error } = await supabase
        .from('categories_with_counts')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('Failed to fetch category:', error);
        return null;
    }

    return mapRowToCategory(data);
}

/**
 * Get category by slug
 */
export async function findCategoryBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await supabase
        .from('categories_with_counts')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error || !data) {
        return null;
    }

    return mapRowToCategory(data);
}

/**
 * Get formatted event count string for display
 */
export function getFormattedEventCount(category: Category): string {
    return formatEventCount(category.eventCount);
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
            subscribers: `${c.subscriberCount} Subscribers`,
            location: c.location
        }));
    } catch (error) {
        console.error('Failed to fetch featured calendars:', error);
        return [];
    }
}

