/**
 * Calendar Utilities
 * Generate calendar links and ICS files for event integration
 */

export interface CalendarEvent {
    title: string;
    description: string;
    location: string;
    startDate: Date;
    endDate: Date;
}

/**
 * Generate Google Calendar URL
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\\.\\d+/g, '').slice(0, 15) + 'Z';

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        details: event.description,
        location: event.location,
        dates: `${formatDate(event.startDate)}/${formatDate(event.endDate)}`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Web URL
 */
export function generateOutlookUrl(event: CalendarEvent): string {
    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: event.title,
        body: event.description,
        location: event.location,
        startdt: event.startDate.toISOString(),
        enddt: event.endDate.toISOString(),
    });

    return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

/**
 * Generate ICS file content
 */
export function generateICSContent(event: CalendarEvent): string {
    const formatICSDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\\.\\d+/g, '').slice(0, 15) + 'Z';
    };

    const escapeICS = (text: string) => {
        return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    };

    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@luma.app`;

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Luma//Event//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(event.startDate)}`,
        `DTEND:${formatICSDate(event.endDate)}`,
        `SUMMARY:${escapeICS(event.title)}`,
        `DESCRIPTION:${escapeICS(event.description)}`,
        `LOCATION:${escapeICS(event.location)}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}

/**
 * Download ICS file
 */
export function downloadICS(event: CalendarEvent): void {
    const content = generateICSContent(event);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Parse event date string to Date object
 * Handles formats like "Sep 12, 10:00 AM" or ISO strings
 */
export function parseEventDate(dateStr: string, addHours: number = 0): Date {
    // Try ISO format first
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
        return new Date(isoDate.getTime() + addHours * 60 * 60 * 1000);
    }

    // Try parsing "Sep 12, 10:00 AM" format
    // Use current year as default
    const currentYear = new Date().getFullYear();
    const withYear = `${dateStr} ${currentYear}`;
    const parsed = new Date(withYear);

    if (!isNaN(parsed.getTime())) {
        return new Date(parsed.getTime() + addHours * 60 * 60 * 1000);
    }

    // Fallback to now + addHours
    return new Date(Date.now() + addHours * 60 * 60 * 1000);
}
