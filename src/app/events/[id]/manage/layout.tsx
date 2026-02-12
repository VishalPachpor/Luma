import { eventRepository, calendarRepository } from '@/lib/repositories';
import { notFound } from 'next/navigation';
import { EventManageHeader } from './EventManageHeader';
import { ManagePageWrapper } from './ManagePageWrapper';

interface ManageLayoutProps {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}

export default async function ManageLayout({ children, params }: ManageLayoutProps) {
    const { id } = await params;
    const event = await eventRepository.findById(id);

    if (!event) {
        notFound();
    }

    // Fetch Calendar Details for Breadcrumb
    let calendarName = 'Personal';
    let calendarLink = '/calendar/personal/manage';

    if (event.calendarId) {
        const calendar = await calendarRepository.findById(event.calendarId);
        if (calendar) {
            calendarName = calendar.name;
            calendarLink = `/calendar/${calendar.id}/manage`;
        }
    } else if (event.organizerId) {
        // Fallback: Try to find a personal calendar for the organizer
        const calendars = await calendarRepository.findByOwner(event.organizerId);
        if (calendars.length > 0) {
            // Prefer one named 'Personal' or just the first one
            const personal = calendars.find(c => c.name === 'Personal') || calendars[0];
            calendarName = personal.name;
            calendarLink = `/calendar/${personal.id}/manage`;
        }
    }

    return (
        <ManagePageWrapper>
            <div className="min-h-screen bg-bg-primary">
                {/* Progressive Collapsing Header */}
                <EventManageHeader
                    eventId={id}
                    eventTitle={event.title}
                    calendarName={calendarName}
                    calendarLink={calendarLink}
                />

                {/* Main Content */}
                <main className="max-w-[800px] mx-auto px-8 py-12">
                    {children}
                </main>
            </div>
        </ManagePageWrapper>
    );
}
