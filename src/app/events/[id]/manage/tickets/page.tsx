/**
 * Manage Tickets Page
 * Organizer dashboard for creating and managing ticket tiers
 */

import { eventRepository } from '@/lib/repositories';
import { notFound } from 'next/navigation';
import TicketTiersManager from '@/components/features/tickets/TicketTiersManager';

interface ManageTicketsPageProps {
    params: Promise<{ id: string }>;
}

export default async function ManageTicketsPage({ params }: ManageTicketsPageProps) {
    const { id } = await params;
    const event = await eventRepository.findById(id);

    if (!event) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white">Ticket Tiers</h2>
                    <p className="text-text-muted text-sm">Create and manage ticket pricing</p>
                </div>
            </div>

            <TicketTiersManager eventId={id} eventTitle={event.title} />
        </div>
    );
}
