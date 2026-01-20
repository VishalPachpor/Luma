/**
 * City Types
 * Types for city-based event discovery
 */

export interface City {
    id: string;
    name: string;
    slug: string;
    eventCount: number;
    region: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    imageUrl?: string;
    timezone?: string;
}

// Mock city data matching Luma's Explore Local Events
export const CITIES: City[] = [
    // Asia & Pacific
    { id: 'singapore', name: 'Singapore', slug: 'singapore', eventCount: 32, region: 'Asia & Pacific', coordinates: { lat: 1.3521, lng: 103.8198 } },
    { id: 'bengaluru', name: 'Bengaluru', slug: 'bengaluru', eventCount: 29, region: 'Asia & Pacific', coordinates: { lat: 12.9716, lng: 77.5946 } },
    { id: 'tokyo', name: 'Tokyo', slug: 'tokyo', eventCount: 25, region: 'Asia & Pacific', coordinates: { lat: 35.6762, lng: 139.6503 } },
    { id: 'hong-kong', name: 'Hong Kong', slug: 'hongkong', eventCount: 16, region: 'Asia & Pacific', coordinates: { lat: 22.3193, lng: 114.1694 } },
    { id: 'mumbai', name: 'Mumbai', slug: 'mumbai', eventCount: 13, region: 'Asia & Pacific', coordinates: { lat: 19.076, lng: 72.8777 } },
    { id: 'new-delhi', name: 'New Delhi', slug: 'new-delhi', eventCount: 12, region: 'Asia & Pacific', coordinates: { lat: 28.6139, lng: 77.209 } },
    { id: 'taipei', name: 'Taipei', slug: 'taipei', eventCount: 12, region: 'Asia & Pacific', coordinates: { lat: 25.033, lng: 121.5654 } },
    { id: 'sydney', name: 'Sydney', slug: 'sydney', eventCount: 11, region: 'Asia & Pacific', coordinates: { lat: -33.8688, lng: 151.2093 } },
    { id: 'bangkok', name: 'Bangkok', slug: 'bangkok', eventCount: 10, region: 'Asia & Pacific', coordinates: { lat: 13.7563, lng: 100.5018 } },
    { id: 'manila', name: 'Manila', slug: 'manila', eventCount: 9, region: 'Asia & Pacific', coordinates: { lat: 14.5995, lng: 120.9842 } },
    { id: 'jakarta', name: 'Jakarta', slug: 'jakarta', eventCount: 9, region: 'Asia & Pacific', coordinates: { lat: -6.2088, lng: 106.8456 } },
    { id: 'ho-chi-minh', name: 'Ho Chi Minh City', slug: 'ho-chi-minh-city', eventCount: 8, region: 'Asia & Pacific', coordinates: { lat: 10.8231, lng: 106.6297 } },
    { id: 'melbourne', name: 'Melbourne', slug: 'melbourne', eventCount: 7, region: 'Asia & Pacific', coordinates: { lat: -37.8136, lng: 144.9631 } },
    { id: 'seoul', name: 'Seoul', slug: 'seoul', eventCount: 6, region: 'Asia & Pacific', coordinates: { lat: 37.5665, lng: 126.978 } },
    { id: 'kuala-lumpur', name: 'Kuala Lumpur', slug: 'kuala-lumpur', eventCount: 6, region: 'Asia & Pacific', coordinates: { lat: 3.139, lng: 101.6869 } },
    { id: 'brisbane', name: 'Brisbane', slug: 'brisbane', eventCount: 4, region: 'Asia & Pacific', coordinates: { lat: -27.4698, lng: 153.0251 } },

    // Middle East (Grouping under Asia & Pacific or Europe depending on preference, putting via Coordinates usually)
    { id: 'tel-aviv', name: 'Tel Aviv-Yafo', slug: 'tel-aviv', eventCount: 19, region: 'Asia & Pacific', coordinates: { lat: 32.0853, lng: 34.7818 } },
    { id: 'dubai', name: 'Dubai', slug: 'dubai', eventCount: 7, region: 'Asia & Pacific', coordinates: { lat: 25.2048, lng: 55.2708 } },

    // North America
    { id: 'honolulu', name: 'Honolulu', slug: 'honolulu', eventCount: 8, region: 'North America', coordinates: { lat: 21.3069, lng: -157.8583 } },
    { id: 'sf', name: 'San Francisco', slug: 'san-francisco', eventCount: 42, region: 'North America', coordinates: { lat: 37.7749, lng: -122.4194 } },
    { id: 'nyc', name: 'New York', slug: 'new-york', eventCount: 35, region: 'North America', coordinates: { lat: 40.7128, lng: -74.0060 } },

    // Europe
    { id: 'london', name: 'London', slug: 'london', eventCount: 38, region: 'Europe', coordinates: { lat: 51.5074, lng: -0.1278 } },
    { id: 'berlin', name: 'Berlin', slug: 'berlin', eventCount: 22, region: 'Europe', coordinates: { lat: 52.5200, lng: 13.4050 } },
    { id: 'paris', name: 'Paris', slug: 'paris', eventCount: 18, region: 'Europe', coordinates: { lat: 48.8566, lng: 2.3522 } },
];
