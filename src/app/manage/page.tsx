'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Edit, Trash2, Plus, Loader2 } from 'lucide-react';
import { GlossyCard, Button } from '@/components/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useEventsByOrganizer, useDeleteEvent, useUpdateEvent } from '@/hooks/useEvents';
import Image from 'next/image';
import { useState } from 'react';
import EditEventModal from '@/components/features/events/EditEventModal';
import { Event } from '@/types';
import { NotificationBell } from '@/components/features/notifications';

export default function ManageEventsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { data: events = [], isLoading } = useEventsByOrganizer(user?.uid);

    // Mutations
    const deleteMutation = useDeleteEvent();
    const updateMutation = useUpdateEvent();

    // Local State
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Update Handler
    const handleUpdate = async (id: string, updates: Partial<Event>) => {
        await updateMutation.mutateAsync({
            id,
            updates: updates as any
        });
    };

    const handleEditClick = (event: Event) => {
        setEditingEvent(event);
        setIsEditOpen(true);
    };

    // Loading State
    if (authLoading || (isLoading && user)) {
        return (
            <div className="min-h-screen bg-bg-primary pt-32 px-6 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    // Checking Auth
    if (!user) {
        // Simple redirect or prompt
        // For better UX, we could Redirect component, but keeping it simple
        return (
            <div className="min-h-screen bg-bg-primary pt-32 px-6 text-center">
                <h1 className="text-2xl font-bold text-white mb-4">Organizer Dashboard</h1>
                <p className="text-gray-400 mb-6">Please sign in to manage your events.</p>
                <Button onClick={() => router.push('/login')}>Sign In</Button>
            </div>
        );
    }

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to cancel "${title}"? This will email all attendees.`)) return;

        setDeletingId(id);
        await deleteMutation.mutateAsync(id);
        setDeletingId(null);
    };

    return (
        <main className="min-h-screen bg-bg-primary pt-32 px-4 sm:px-6 lg:px-8 pb-20">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Manage Events</h1>
                        <p className="text-text-secondary mt-1">View and control your events</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button onClick={() => router.push('/create-event')} className="gap-2">
                            <Plus size={18} /> Create Event
                        </Button>
                        <NotificationBell />
                    </div>
                </div>

                {/* Event List */}
                {events.length === 0 ? (
                    <GlossyCard className="py-16 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-text-muted" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No events created</h3>
                        <p className="text-text-secondary mb-6 max-w-md mx-auto">
                            You haven&apos;t hosted any events yet. Start your journey as an organizer!
                        </p>
                        <Button variant="secondary" onClick={() => router.push('/create-event')}>
                            Create Your First Event
                        </Button>
                    </GlossyCard>
                ) : (
                    <div className="grid gap-6">
                        {events.map((event) => (
                            <motion.div
                                key={event.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <GlossyCard className="p-0 overflow-hidden flex flex-col md:flex-row group">
                                    {/* Image */}
                                    <div className="relative w-full md:w-64 h-48 md:h-auto shrink-0">
                                        <Image
                                            src={event.coverImage || '/placeholder-event.jpg'}
                                            alt={event.title}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/40 md:hidden" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium 
                                                    ${new Date(event.date) < new Date() ? 'bg-white/10 text-gray-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {new Date(event.date) < new Date() ? 'Past' : 'Upcoming'}
                                                </span>
                                            </div>

                                            <div className="space-y-1 text-sm text-text-secondary mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-accent" />
                                                    {new Date(event.date).toLocaleString()}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-accent" />
                                                    {event.location}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="gap-2 flex-1"
                                                onClick={() => handleEditClick(event)}
                                            >
                                                <Edit size={14} /> Edit
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-2 flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                onClick={() => handleDelete(event.id, event.title)}
                                                disabled={deletingId === event.id}
                                            >
                                                {deletingId === event.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={14} />
                                                )}
                                                Cancel Event
                                            </Button>
                                        </div>
                                    </div>
                                </GlossyCard>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <EditEventModal
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                event={editingEvent}
                onSave={handleUpdate}
            />
        </main>
    );
}
