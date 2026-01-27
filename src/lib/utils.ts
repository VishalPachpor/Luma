
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Generate a UUID for database records
 * Uses crypto.randomUUID() for standard UUID v4 format
 * Required for Supabase UUID columns
 */
export function generateId(): string {
    return crypto.randomUUID();
}

export function getGoogleMapsUrl(lat: number | undefined, lng: number | undefined, location?: string): string {
    if (lat && lng) {
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    if (location) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    }
    return 'https://maps.google.com';
}
