/**
 * Calendar Manage Index Page
 * Redirects to the Events tab by default
 */

import { redirect } from 'next/navigation';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function CalendarManagePage({ params }: PageProps) {
    const { id } = await params;
    redirect(`/calendar/${id}/manage/events`);
}
