
import { eventRepository } from '@/lib/repositories';
import { notFound } from 'next/navigation';
import { Ticket } from 'lucide-react';
import { RegistrationForm } from './RegistrationForm';
import TicketTiersManager from '@/components/features/tickets/TicketTiersManager';
import RegistrationEmailManager from '@/components/features/events/RegistrationEmailManager';

import { Button, GlossyCard } from '@/components/components/ui';

interface RegistrationPageProps {
    params: Promise<{ id: string }>;
}

export default async function RegistrationPage({ params }: RegistrationPageProps) {
    const { id } = await params;
    const event = await eventRepository.findById(id);

    if (!event) {
        notFound();
    }

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-white">Registration</h1>

            {/* Tickets */}
            <GlossyCard className="p-6">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                            <Ticket className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Tickets</h3>
                            <p className="text-sm text-text-muted">Manage ticket types and prices.</p>
                        </div>
                    </div>
                </div>
                <TicketTiersManager eventId={id} eventTitle={event.title} />
            </GlossyCard>

            {/* Registration Email */}
            <RegistrationEmailManager eventId={id} initialSettings={event.settings} />


            {/* Registration Questions */}
            <RegistrationForm
                eventId={id}
                initialQuestions={event.registrationQuestions || []}
            />
        </div>
    );
}
