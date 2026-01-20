/**
 * City Repository
 * Data access layer for city-based discovery
 * Aggregates event counts from the 'events' table
 */

import { supabase } from '@/lib/supabase';
import { City, CITIES } from '@/types/city';

/**
 * Get all cities with dynamic event counts
 * Merges static city data (coordinates, images) with live event counts
 */
export async function findAllCitiesWithCounts(): Promise<City[]> {
    try {
        // Fetch all published events with their city
        const { data: eventsData, error } = await supabase
            .from('events')
            .select('city')
            .eq('status', 'published');

        if (error) {
            console.error('Failed to fetch event cities:', error);
            return CITIES; // Return static data on error
        }

        const events = eventsData as { city: string }[] | null;

        // Count events per city
        const cityCounts: Record<string, number> = {};

        events?.forEach((event) => {
            if (event.city) {
                // Normalize city name for matching
                const normalizedCity = event.city.trim().toLowerCase();
                cityCounts[normalizedCity] = (cityCounts[normalizedCity] || 0) + 1;
            }
        });

        // Update counts in the curated CITIES list
        const updatedCities = CITIES.map(city => {
            const normalizedName = city.name.toLowerCase();
            // Check for direct match or variations if needed
            // For now, simple case-insensitive match
            const count = cityCounts[normalizedName] || 0;

            return {
                ...city,
                eventCount: count
            };
        });

        // Optional: Sort by count desc? Or keep curated order?
        // Let's keep curated order or sort by region + count?
        // Use default order from CITIES constant for now

        return updatedCities;

    } catch (err) {
        console.error('City fetch error:', err);
        return CITIES;
    }
}
