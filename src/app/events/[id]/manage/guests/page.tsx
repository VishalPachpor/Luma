
import { eventRepository } from '@/lib/repositories';
import { notFound } from 'next/navigation';
import { GuestManagement } from '@/components/features/guests';

interface GuestsPageProps {
    params: Promise<{ id: string }>;
}

export default async function GuestsPage({ params }: GuestsPageProps) {
    const { id } = await params;
    const event = await eventRepository.findById(id);

    if (!event) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white">Guests</h2>
                    <p className="text-text-muted text-sm">Manage invites and approvals.</p>
                </div>
            </div>

            <GuestManagement eventId={id} eventTitle={event.title} />
        </div>
    );
}
