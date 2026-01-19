/**
 * City Types
 * Types for city-based event discovery
 */

export interface City {
    id: string;
    name: string;
    slug: string;
    eventCount: number;
    coordinates?: {
        lat: number;
        lng: number;
    };
    imageUrl?: string;
    timezone?: string;
}

// Mock city data matching Luma's Explore Local Events
export const CITIES: City[] = [
    { id: 'singapore', name: 'Singapore', slug: 'singapore', eventCount: 32, coordinates: { lat: 1.3521, lng: 103.8198 } },
    { id: 'bengaluru', name: 'Bengaluru', slug: 'bengaluru', eventCount: 29, coordinates: { lat: 12.9716, lng: 77.5946 } },
    { id: 'tokyo', name: 'Tokyo', slug: 'tokyo', eventCount: 25, coordinates: { lat: 35.6762, lng: 139.6503 } },
    { id: 'tel-aviv', name: 'Tel Aviv-Yafo', slug: 'tel-aviv', eventCount: 19, coordinates: { lat: 32.0853, lng: 34.7818 } },
    { id: 'hong-kong', name: 'Hong Kong', slug: 'hongkong', eventCount: 16, coordinates: { lat: 22.3193, lng: 114.1694 } },
    { id: 'mumbai', name: 'Mumbai', slug: 'mumbai', eventCount: 13, coordinates: { lat: 19.076, lng: 72.8777 } },
    { id: 'new-delhi', name: 'New Delhi', slug: 'new-delhi', eventCount: 12, coordinates: { lat: 28.6139, lng: 77.209 } },
    { id: 'taipei', name: 'Taipei', slug: 'taipei', eventCount: 12, coordinates: { lat: 25.033, lng: 121.5654 } },
    { id: 'sydney', name: 'Sydney', slug: 'sydney', eventCount: 11, coordinates: { lat: -33.8688, lng: 151.2093 } },
    { id: 'bangkok', name: 'Bangkok', slug: 'bangkok', eventCount: 10, coordinates: { lat: 13.7563, lng: 100.5018 } },
    { id: 'manila', name: 'Manila', slug: 'manila', eventCount: 9, coordinates: { lat: 14.5995, lng: 120.9842 } },
    { id: 'jakarta', name: 'Jakarta', slug: 'jakarta', eventCount: 9, coordinates: { lat: -6.2088, lng: 106.8456 } },
    { id: 'ho-chi-minh', name: 'Ho Chi Minh City', slug: 'ho-chi-minh-city', eventCount: 8, coordinates: { lat: 10.8231, lng: 106.6297 } },
    { id: 'honolulu', name: 'Honolulu', slug: 'honolulu', eventCount: 8, coordinates: { lat: 21.3069, lng: -157.8583 } },
    { id: 'dubai', name: 'Dubai', slug: 'dubai', eventCount: 7, coordinates: { lat: 25.2048, lng: 55.2708 } },
    { id: 'melbourne', name: 'Melbourne', slug: 'melbourne', eventCount: 7, coordinates: { lat: -37.8136, lng: 144.9631 } },
    { id: 'seoul', name: 'Seoul', slug: 'seoul', eventCount: 6, coordinates: { lat: 37.5665, lng: 126.978 } },
    { id: 'kuala-lumpur', name: 'Kuala Lumpur', slug: 'kuala-lumpur', eventCount: 6, coordinates: { lat: 3.139, lng: 101.6869 } },
    { id: 'brisbane', name: 'Brisbane', slug: 'brisbane', eventCount: 4, coordinates: { lat: -27.4698, lng: 153.0251 } },
];
