
import { eventRepository } from '@/lib/repositories';
import { notFound } from 'next/navigation';
import { Ticket, Mail } from 'lucide-react';
import { RegistrationForm } from './RegistrationForm';

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
            <div className="bg-[#0B1221] border border-white/10 rounded-xl p-6">
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
                    <button className="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-lg transition-colors">
                        + New Ticket Type
                    </button>
                </div>

                <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                    <div>
                        <div className="text-white font-medium">Standard</div>
                        <div className="text-sm text-text-muted">Free • Unlimited</div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-muted">
                        <span>0 Sold</span>
                        <button className="text-white hover:text-indigo-400">Edit</button>
                    </div>
                </div>
            </div>

            {/* Registration Email */}
            <div className="bg-[#0B1221] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                        <Mail className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Registration Email</h3>
                        <p className="text-sm text-text-muted">Customize the email guests receive upon registering.</p>
                    </div>
                </div>
                <button className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
                    Customize Email
                </button>
            </div>


            {/* Registration Questions */}
            <RegistrationForm
                eventId={id}
                initialQuestions={event.registrationQuestions || []}
            />
        </div>
    );
}
