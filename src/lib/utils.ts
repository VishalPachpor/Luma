
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { nanoid } from 'nanoid';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function generateId(): string {
    return nanoid();
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
