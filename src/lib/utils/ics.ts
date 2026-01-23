/**
 * ICS Generator Utility
 * Generates iCalendar format strings for calendar feeds
 */

import { Event } from '@/types';
import { format } from 'date-fns';

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    // Format: YYYYMMDDTHHmmssZ
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateICSFeed({
    calendarName,
    events,
    calendarUrl
}: {
    calendarName: string;
    events: Event[];
    calendarUrl?: string;
}): string {
    const now = formatDate(new Date().toISOString());

    let content = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Luma//Calendar//EN',
        `X-WR-CALNAME:${calendarName}`,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
    ];

    if (calendarUrl) {
        content.push(`URL:${calendarUrl}`);
    }

    events.forEach(event => {
        try {
            // Skip invalid dates
            if (!event.date) return;

            // Parse event date - assumed to be ISO string or parseable
            // Luma stores "Sep 12, 2026, 10:00 AM" which is display format, 
            // but real DB should store ISO.
            // If it's the specific display format, we need to parse it carefully.
            // Let's rely on standard Date parsing for now, assuming ISO is preferred in new data
            const dtStart = new Date(event.date);
            if (isNaN(dtStart.getTime())) return;

            const start = formatDate(dtStart.toISOString());
            // Default 1 hour duration if no end time
            const dtEnd = new Date(dtStart.getTime() + 60 * 60 * 1000);
            const end = formatDate(dtEnd.toISOString());

            content.push('BEGIN:VEVENT');
            content.push(`UID:${event.id}@luma.com`);
            content.push(`DTSTAMP:${now}`);
            content.push(`DTSTART:${start}`);
            content.push(`DTEND:${end}`);
            content.push(`SUMMARY:${event.title}`);
            if (event.description) {
                // Escape special characters
                const desc = event.description
                    .replace(/\\/g, '\\\\')
                    .replace(/;/g, '\\;')
                    .replace(/,/g, '\\,')
                    .replace(/\n/g, '\\n');
                content.push(`DESCRIPTION:${desc}`);
            }
            if (event.location) {
                content.push(`LOCATION:${event.location}`);
            }
            content.push(`URL:https://luma.com/events/${event.id}`);
            content.push('END:VEVENT');
        } catch (e) {
            console.error('Error processing event for ICS:', event.id, e);
        }
    });

    content.push('END:VCALENDAR');
    return content.join('\r\n');
}
