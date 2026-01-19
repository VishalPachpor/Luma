'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Check, Star, Loader2, CalendarX2, Plus, Users } from 'lucide-react';
import { GlossyCard, Button } from '@/components/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useMyEvents } from '@/hooks/useMyEvents';
import { useEventsByOrganizer } from '@/hooks/useEvents';
import AddToCalendar from './AddToCalendar';

type Tab = 'going' | 'hosting';

export default function MyEventsList() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('going');

    // Fetch RSVP'd events
    const { data: myEvents = [], isLoading: rsvpLoading } = useMyEvents(user?.uid);

    // Fetch Hosted events
    const { data: hostedEvents = [], isLoading: hostingLoading } = useEventsByOrganizer(user?.uid);

    const loading = rsvpLoading || hostingLoading;

    if (authLoading || (loading && !myEvents.length && !hostedEvents.length)) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
                <p className="text-text-muted">Loading your events...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <CalendarX2 className="w-16 h-16 text-text-muted mb-4" />
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Sign in to see your events
                </h3>
                <p className="text-text-secondary mb-6">
                    Manage your events and RSVPs in one place
                </p>
                <Button onClick={() => router.push('/login')}>
                    Sign In
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text-primary">My Events</h2>

                {/* Tab Switcher */}
                <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('going')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'going'
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-text-secondary hover:text-white'
                            }`}
                    >
                        Going ({myEvents.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('hosting')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'hosting'
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-text-secondary hover:text-white'
                            }`}
                    >
                        Hosting ({hostedEvents.length})
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'going' ? (
                    <motion.div
                        key="going"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                    >
                        {myEvents.length === 0 ? (
                            <EmptyState
                                icon={CalendarX2}
                                title="No upcoming events"
                                description="Discover and register for events to see them here"
                                actionLabel="Discover Events"
                                onAction={() => router.push('/')}
                            />
                        ) : (
                            myEvents.map((entry, idx) => (
                                <EventCard
                                    key={entry.event.id}
                                    event={entry.event}
                                    rsvpStatus={entry.rsvpStatus}
                                    index={idx}
                                />
                            ))
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="hosting"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        {hostedEvents.length === 0 ? (
                            <EmptyState
                                icon={Plus}
                                title="Host your first event"
                                description="Create and manage your own events and build your community."
                                actionLabel="Create Event"
                                onAction={() => router.push('/create-event')}
                            />
                        ) : (
                            hostedEvents.map((event, idx) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    isHost
                                    index={idx}
                                />
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Subcomponents for cleaner code

function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: any) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
                {title}
            </h3>
            <p className="text-text-secondary mb-6 text-sm max-w-xs">
                {description}
            </p>
            <Button variant="secondary" onClick={onAction} size="sm">
                {actionLabel}
            </Button>
        </div>
    );
}

function EventCard({ event, rsvpStatus, isHost, index }: any) {
    const router = useRouter();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <GlossyCard className="p-0 overflow-hidden hover:border-accent/50 transition-all group">
                <div className="flex flex-col sm:flex-row">
                    {/* Event Image */}
                    <div
                        className="relative w-full sm:w-48 h-32 sm:h-auto cursor-pointer overflow-hidden"
                        onClick={() => router.push(`/events/${event.id}`)}
                    >
                        <Image
                            src={event.coverImage || '/placeholder-event.jpg'}
                            alt={event.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Host Badge Overlay */}
                        {isHost && (
                            <div className="absolute top-2 left-2 bg-indigo-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                                <Users size={10} /> HOST
                            </div>
                        )}
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div
                                className="flex-1 cursor-pointer"
                                onClick={() => router.push(`/events/${event.id}`)}
                            >
                                <h3 className="font-bold text-text-primary text-lg mb-2 group-hover:text-accent transition-colors">
                                    {event.title}
                                </h3>

                                <div className="flex items-center gap-2 text-sm text-text-secondary mb-1">
                                    <Calendar size={14} className="text-accent" />
                                    {event.date}
                                </div>

                                {event.location && (
                                    <div className="flex items-center gap-2 text-sm text-text-muted">
                                        <MapPin size={14} />
                                        {event.location}
                                    </div>
                                )}
                            </div>

                            {/* Status Badge */}
                            {!isHost && rsvpStatus && (
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${rsvpStatus === 'going'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    }`}>
                                    {rsvpStatus === 'going' ? (
                                        <><Check size={12} /> Going</>
                                    ) : (
                                        <><Star size={12} /> Interested</>
                                    )}
                                </div>
                            )}

                            {isHost && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 text-xs bg-white/5 hover:bg-white/10"
                                    onClick={() => router.push(`/events/${event.id}`)}
                                >
                                    Manage
                                </Button>
                            )}
                        </div>

                        {/* Action Row */}
                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-xs text-text-muted">
                                By {event.organizer || 'You'}
                            </span>
                            <AddToCalendar
                                eventTitle={event.title}
                                eventDescription={event.description}
                                eventLocation={event.location}
                                eventDate={event.date}
                            />
                        </div>
                    </div>
                </div>
            </GlossyCard>
        </motion.div>
    );
}
