/**
 * Event List Component
 * Displays a grid of event cards
 */

'use client';

import { Event } from '@/types';
import TimelineEventList from './TimelineEventList';
import { GlossyCard } from '@/components/components/ui';
import { Calendar, MapPin, Users, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import Image from 'next/image';

interface EventListProps {
    events: Event[];
}

export default function EventList({ events }: EventListProps) {
    const { searchQuery, setSelectedEventId } = useStore();

    const filteredEvents = events.filter(
        (event) =>
            event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (filteredEvents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-bg-tertiary rounded-2xl flex items-center justify-center mb-4 border border-border-default">
                    <Calendar size={32} className="text-text-muted" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary">
                    No events found
                </h3>
                <p className="text-text-secondary mt-2">
                    Try adjusting your search terms or filters.
                </p>
            </div>
        );
    }

    return (
        <div className="md:col-span-3 lg:col-span-4">
            <TimelineEventList events={filteredEvents} />
        </div>
    );
}
