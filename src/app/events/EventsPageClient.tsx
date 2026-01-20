/**
 * Events Page Client Component (Luma-style)
 * Timeline layout with date on left, event cards on right
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/components/layout/Navbar';
import { Footer } from '@/components/components/layout';
import { Event } from '@/types';
import { getEvents } from '@/lib/services/event.service';
import { EventDrawer } from '@/components/features/events/EventDrawer';

interface EventsPageClientProps {
    cookie: string;
}

export default function EventsPageClient({ cookie }: EventsPageClientProps) {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await getEvents();
                setEvents(data);
            } catch (error) {
                console.error('Failed to fetch events:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const handleEventClick = (event: Event) => {
        setSelectedEvent(event);
        setIsDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setTimeout(() => setSelectedEvent(null), 300);
    };

    // Group events by date
    const groupEventsByDate = (events: Event[]) => {
        const groups: Record<string, { dayName: string; dateLabel: string; events: Event[] }> = {};

        events.forEach(event => {
            const eventDate = new Date(event.date);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            let dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
            let dateLabel = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            // Check if tomorrow
            if (eventDate.toDateString() === tomorrow.toDateString()) {
                dayName = 'Tomorrow';
                dateLabel = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
            } else if (eventDate.toDateString() === today.toDateString()) {
                dayName = 'Today';
                dateLabel = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
            }

            const key = eventDate.toDateString();
            if (!groups[key]) {
                groups[key] = { dayName, dateLabel, events: [] };
            }
            groups[key].events.push(event);
        });

        return Object.values(groups);
    };

    // Filter events based on active tab
    const now = new Date();
    const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        if (activeTab === 'upcoming') {
            return eventDate >= now;
        } else {
            return eventDate < now;
        }
    });

    // Sort: upcoming = ascending by date, past = descending by date
    const sortedEvents = [...filteredEvents].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return activeTab === 'upcoming' ? dateA - dateB : dateB - dateA;
    });

    const groupedEvents = groupEventsByDate(sortedEvents);

    return (
        <div className="flex flex-col min-h-screen bg-[#0E0F13]">
            <Navbar />
            <main className="flex-1 pt-16">
                <div className="max-w-[800px] mx-auto px-8 py-10">
                    {/* Header with Tabs */}
                    <div className="flex items-center justify-between mb-10">
                        <h1 className="text-[2rem] font-bold text-white tracking-tight">
                            Events
                        </h1>

                        {/* Upcoming / Past Tabs */}
                        <div className="flex items-center bg-white/5 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('upcoming')}
                                className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${activeTab === 'upcoming'
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                Upcoming
                            </button>
                            <button
                                onClick={() => setActiveTab('past')}
                                className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${activeTab === 'past'
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                Past
                            </button>
                        </div>
                    </div>

                    {/* Events Timeline */}
                    {loading ? (
                        <div className="space-y-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-8">
                                    <div className="w-20 h-12 rounded bg-white/5 animate-pulse" />
                                    <div className="flex-1 h-32 rounded-xl bg-white/5 animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-white/50">No {activeTab} events</p>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            {groupedEvents.map((group, groupIdx) => (
                                <div key={groupIdx}>
                                    {group.events.map((event, idx) => (
                                        <TimelineEventCard
                                            key={event.id}
                                            event={event}
                                            dayName={idx === 0 ? group.dayName : undefined}
                                            dateLabel={idx === 0 ? group.dateLabel : undefined}
                                            index={groupIdx * 10 + idx}
                                            onEventClick={handleEventClick}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Event Quick View Drawer */}
            <EventDrawer
                event={selectedEvent}
                isOpen={isDrawerOpen}
                onClose={handleCloseDrawer}
            />

            <Footer />
        </div>
    );
}

function TimelineEventCard({
    event,
    dayName,
    dateLabel,
    index,
    onEventClick,
}: {
    event: Event;
    dayName?: string;
    dateLabel?: string;
    index: number;
    onEventClick: (event: Event) => void;
}) {
    const eventDate = new Date(event.date);
    const timeStr = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

    // Get timezone
    const offset = -eventDate.getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const sign = offset >= 0 ? '+' : '-';
    // Simplified timezone display
    const tz = `GMT${sign}${hours}`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex gap-6 py-6"
        >
            {/* Left: Date Column */}
            <div className="w-24 shrink-0 text-right pt-1">
                {dayName && (
                    <>
                        <div className="text-[14px] font-semibold text-white">
                            {dayName}
                        </div>
                        <div className="text-[13px] text-white/40">
                            {dateLabel}
                        </div>
                    </>
                )}
            </div>

            {/* Timeline Dot */}
            <div className="flex flex-col items-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-white/30 mt-2" />
                <div className="w-px flex-1 bg-white/10 mt-2" />
            </div>

            {/* Right: Event Card */}
            <div
                onClick={() => onEventClick(event)}
                className="flex-1 max-w-[500px] p-4 rounded-xl bg-white/2 border border-white/5 hover:bg-white/4 hover:border-white/10 transition-colors group cursor-pointer"
            >
                <div className="flex gap-4">
                    {/* Event Info */}
                    <div className="flex-1 min-w-0">
                        {/* Time */}
                        <div className="text-[13px] text-white/50 mb-1">
                            {timeStr} <span className="text-amber-500">{tz}</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-[15px] font-semibold text-white mb-2 group-hover:text-white/90">
                            {event.title}
                        </h3>

                        {/* Organizer */}
                        {event.organizer && (
                            <div className="flex items-center gap-2 text-[12px] text-white/50 mb-2">
                                <Users size={12} />
                                <span className="truncate">By {event.organizer}</span>
                            </div>
                        )}

                        {/* Location */}
                        {event.location && (
                            <div className="flex items-center gap-1.5 text-[12px] text-white/40 mb-3">
                                <MapPin size={11} />
                                <span className="truncate">{event.location}</span>
                            </div>
                        )}

                        {/* Badge */}
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400">
                            Going
                        </span>
                    </div>

                    {/* Event Thumbnail */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-white/5 shrink-0 relative">
                        {event.coverImage ? (
                            <Image
                                src={event.coverImage}
                                alt={event.title}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-linear-to-br from-purple-500/20 to-pink-500/20" />
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
