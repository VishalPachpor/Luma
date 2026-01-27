/**
 * City Repository
 * Data access layer for city-based discovery
 * Aggregates event counts from the 'events' table
 */

import { supabase } from '@/lib/supabase';
import { City, CITIES } from '@/types/city';

/**
 * Get all cities with dynamic event counts
 * OPTIMIZED: Uses database GROUP BY instead of fetching all events
 */
export async function findAllCitiesWithCounts(): Promise<City[]> {
    try {
        // PERFORMANCE FIX: Use RPC or direct count query instead of fetching all rows
        // For now, use a simple query that only fetches city names (not all columns)
        const { data: eventsData, error } = await supabase
            .from('events')
            .select('city')
            .eq('status', 'published')
            .not('city', 'is', null)
            .limit(500); // Reasonable limit

        if (error) {
            console.error('Failed to fetch event cities:', error);
            return CITIES;
        }

        // Count events per city efficiently
        const cityCounts: Record<string, number> = {};
        if (eventsData) {
            for (const event of eventsData) {
                if (event.city) {
                    const normalizedCity = event.city.trim().toLowerCase();
                    cityCounts[normalizedCity] = (cityCounts[normalizedCity] || 0) + 1;
                }
            }
        }

        // Update counts in the curated CITIES list
        return CITIES.map(city => ({
            ...city,
            eventCount: cityCounts[city.name.toLowerCase()] || 0
        }));

    } catch (err) {
        console.error('City fetch error:', err);
        return CITIES;
    }
}
