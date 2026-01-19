/**
 * Filtered Events View
 * Shows events filtered by category or city
 */

'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Users } from 'lucide-react';
import Image from 'next/image';
import { useStore } from '@/store/useStore';
import { Event, Category } from '@/types';
import { GlossyCard, Button } from '@/components/components/ui';

interface FilteredEventsProps {
    events: Event[];
    categories: Category[];
}

import { useRouter } from 'next/navigation';

export default function FilteredEvents({ events, categories }: FilteredEventsProps) {
    const { selectedCategory, setSelectedCategory } = useStore();
    const router = useRouter();

    // Find selected category details
    const category = categories.find(c => c.id === selectedCategory);

    // Filter events by category (checking if category name is in event tags)
    const filteredEvents = events.filter(event =>
        event.tags?.some(tag =>
            tag.toLowerCase() === selectedCategory?.toLowerCase() ||
            tag.toLowerCase() === category?.name.toLowerCase()
        )
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="rounded-full"
                >
                    <ArrowLeft size={18} />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">
                        {category?.name || selectedCategory} Events
                    </h2>
                    <p className="text-sm text-text-secondary">
                        {filteredEvents.length} events found
                    </p>
                </div>
            </div>

            {/* Events Grid */}
            {filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map((event, idx) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => router.push(`/events/${event.id}`)}
                            className="cursor-pointer"
                        >
                            <GlossyCard className="overflow-hidden group hover:border-accent/50 transition-all">
                                {/* Event Image */}
                                <div className="relative h-40 overflow-hidden">
                                    <Image
                                        src={event.coverImage || '/placeholder-event.jpg'}
                                        alt={event.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />
                                </div>

                                {/* Event Details */}
                                <div className="p-5 space-y-3">
                                    <h3 className="font-bold text-text-primary text-lg line-clamp-2 group-hover:text-accent transition-colors">
                                        {event.title}
                                    </h3>

                                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                                        <Calendar size={14} className="text-accent" />
                                        {formatDate(event.date)}
                                    </div>

                                    {event.location && (
                                        <div className="flex items-center gap-2 text-sm text-text-muted">
                                            <MapPin size={14} />
                                            <span className="truncate">{event.location}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-sm text-text-muted">
                                        <Users size={14} />
                                        {event.attendees} attending
                                    </div>
                                </div>
                            </GlossyCard>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <GlossyCard className="p-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-text-muted" />
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                        No events found
                    </h3>
                    <p className="text-text-secondary">
                        There are no upcoming events in this category yet.
                    </p>
                    <Button
                        variant="secondary"
                        className="mt-6"
                        onClick={() => setSelectedCategory(null)}
                    >
                        Browse All Categories
                    </Button>
                </GlossyCard>
            )}
        </div>
    );
}
