/**
 * Calendar Events Tab
 * Replicated Luma-style dark theme UI
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import { Plus, MapPin, Users, ArrowRight } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { cn } from '@/lib/utils';
// import { motion } from 'framer-motion'; // Removed to reduce bundle if unused or use standard css transitions

interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    location?: string | null;
    cover_image?: string | null;
    attendee_count: number;
    status: string;
    tags?: string[];
}

type FilterType = 'upcoming' | 'past';

export default function CalendarEventsPage() {
    const params = useParams();
    const calendarId = params.id as string;
    const { user, loading: authLoading } = useAuth();

    const [filter, setFilter] = useState<FilterType>('upcoming');
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = useCallback(async () => {
        if (!user) {
            console.log('[CalendarEvents] No user yet');
            setLoading(false);
            return;
        }

        console.log('[CalendarEvents] Fetching events for user:', user.id);
        setLoading(true);

        const supabase = createSupabaseBrowserClient();
        const now = new Date().toISOString();

        try {
            // 1. Fetch events I organized
            const organizedQuery = supabase
                .from('events')
                .select('id, title, date, location, cover_image, attendee_count, status, tags, organizer_id')
                .eq('organizer_id', user.id);

            // 2. Fetch events I am attending (via guests table)
            const attendingQuery = supabase
                .from('events')
                .select('id, title, date, location, cover_image, attendee_count, status, tags, organizer_id, guests!inner(user_id)')
                .eq('guests.user_id', user.id);

            // Execute in parallel
            const [organizedRes, attendingRes] = await Promise.all([
                organizedQuery,
                attendingQuery
            ]);

            if (organizedRes.error) console.error('Error fetching organized events:', organizedRes.error);
            if (attendingRes.error) console.error('Error fetching attending events:', attendingRes.error);

            console.log('[CalendarEvents] Organized events:', organizedRes.data?.length || 0);
            console.log('[CalendarEvents] Attending events:', attendingRes.data?.length || 0);

            const organizedEvents = organizedRes.data || [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const attendingEvents = (attendingRes.data || []).map((e: any) => {
                const { guests, ...event } = e;
                return event;
            });

            // Merge and Deduplicate
            const allEventsMap = new Map();
            [...organizedEvents, ...attendingEvents].forEach(e => {
                allEventsMap.set(e.id, e);
            });

            let allEvents = Array.from(allEventsMap.values());
            console.log('[CalendarEvents] Total merged events:', allEvents.length);

            // Filter by Time
            allEvents = allEvents.filter(e => {
                const eventDate = e.date;
                if (filter === 'upcoming') return eventDate >= now;
                return eventDate < now;
            });

            // Sort
            allEvents.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return filter === 'upcoming' ? dateA - dateB : dateB - dateA;
            });

            console.log(`[CalendarEvents] Final ${filter} events:`, allEvents.length);
            setEvents(allEvents);

        } catch (err) {
            console.error("Unexpected error fetching events:", err);
            setEvents([]);
        }

        setLoading(false);
    }, [user, filter]);

    useEffect(() => {
        if (!authLoading) {
            fetchEvents();
        }
    }, [authLoading, fetchEvents]);

    // Group events by date key (YYYY-MM-DD) for sorting, but store display labels
    const groupedEvents = events.reduce((groups, event) => {
        const dateObj = parseISO(event.date);
        const dateKey = format(dateObj, 'yyyy-MM-dd');

        if (!groups[dateKey]) {
            let mainLabel = format(dateObj, 'MMM d');
            let subLabel = format(dateObj, 'EEEE');

            if (isToday(dateObj)) {
                mainLabel = 'Today';
                subLabel = format(dateObj, 'EEEE');
            } else if (isTomorrow(dateObj)) {
                mainLabel = 'Tomorrow';
                subLabel = format(dateObj, 'EEEE');
            } else if (!isThisWeek(dateObj)) {
                mainLabel = format(dateObj, 'MMM d');
                subLabel = format(dateObj, 'yyyy');
            }

            groups[dateKey] = {
                mainLabel,
                subLabel,
                events: []
            };
        }
        groups[dateKey].events.push(event);
        return groups;
    }, {} as Record<string, { mainLabel: string; subLabel: string; events: CalendarEvent[] }>);

    return (
        <div className="text-white">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-8 w-full relative z-10">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">Events</h2>
                    <Link href="/create-event" className="flex items-center justify-center w-6 h-6 rounded-full bg-bg-hover text-text-muted hover:bg-bg-hover hover:text-white transition-colors">
                        <Plus className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {/* Pill Filter Toggle - High contrast for visibility */}
                <div className="bg-zinc-800/80 p-1 rounded-full flex gap-1 border border-white/10 shadow-sm">
                    <button
                        onClick={() => setFilter('upcoming')}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                            filter === 'upcoming'
                                ? "bg-white text-black shadow-sm"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        Upcoming
                    </button>
                    <button
                        onClick={() => setFilter('past')}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                            filter === 'past'
                                ? "bg-white text-black shadow-sm"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        Past
                    </button>
                </div>
            </div>

            {/* Events Timeline */}
            {loading ? (
                <EventsSkeleton />
            ) : events.length === 0 ? (
                <EmptyState filter={filter} />
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedEvents).map(([dateKey, group]) => (
                        <div key={dateKey} className="flex gap-4 md:gap-8 group">
                            {/* Date Column (Sticky-ish) */}
                            <div className="w-24 shrink-0 pt-1 text-right md:text-left">
                                <div className="md:sticky md:top-36">
                                    <div className="font-bold text-white text-lg leading-tight">{group.mainLabel}</div>
                                    <div className="text-text-disabled text-sm mt-0.5 font-medium">{group.subLabel}</div>
                                </div>
                            </div>

                            {/* Timeline Line */}
                            <div className="hidden md:flex flex-col items-center relative mr-2">
                                <div className="w-2 h-2 rounded-full bg-bg-hover mt-2.5 z-10" />
                                <div className="w-px bg-bg-hover/50 absolute top-4 bottom-0 left-1/2 -translate-x-1/2 h-full group-last:h-auto" />
                            </div>

                            {/* Events List for this date */}
                            <div className="flex-1 space-y-4 pb-4">
                                {group.events.map((event) => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function EventCard({ event }: { event: CalendarEvent }) {
    const eventTime = format(parseISO(event.date), 'h:mm a');

    return (
        <div className="bg-bg-elevated rounded-2xl p-5 hover:bg-bg-hover transition-colors group relative overflow-hidden border border-white/5 shadow-sm">
            <div className="flex justify-between gap-6">
                <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                        <div className="text-text-muted text-sm font-medium mb-1.5 font-mono tracking-tight">{eventTime}</div>
                        <h3 className="text-xl font-bold text-white mb-3 truncate pr-4">{event.title}</h3>

                        <div className="space-y-2 mb-6">
                            {event.location && (
                                <div className="flex items-center gap-2 text-text-muted text-sm">
                                    <MapPin className="h-4 w-4 shrink-0 text-text-disabled" />
                                    <span className="truncate">{event.location}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-text-muted text-sm">
                                <Users className="h-4 w-4 shrink-0 text-text-disabled" />
                                <span>{event.attendee_count === 0 ? 'No guests' : `${event.attendee_count} guests`}</span>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="flex gap-2 mb-6">
                            <button className="text-xs font-medium text-text-disabled hover:text-text-muted bg-bg-hover hover:bg-bg-hover px-2.5 py-1 rounded-md transition-colors flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Add Tag
                            </button>
                            {event.tags?.map((tag) => (
                                <span key={tag} className="text-xs font-medium text-text-secondary bg-bg-hover px-2.5 py-1 rounded-md">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    <Link href={`/events/${event.id}/manage`} className="inline-flex">
                        <button className="bg-bg-hover hover:bg-bg-hover text-white text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 transition-colors">
                            Manage Event <ArrowRight className="w-3 h-3 text-text-disabled group-hover:text-white transition-colors" />
                        </button>
                    </Link>
                </div>

                {/* Right Image */}
                <div className="shrink-0 w-32 h-32 md:w-40 md:h-40 relative">
                    {event.cover_image ? (
                        <Image
                            src={event.cover_image}
                            alt={event.title}
                            fill
                            className="object-cover rounded-xl bg-bg-hover"
                        />
                    ) : (
                        <div className="w-full h-full rounded-xl bg-bg-hover border border-white/5 flex items-center justify-center">
                            <div className="text-text-disabled font-bold text-2xl">{event.title.charAt(0)}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyState({ filter }: { filter: FilterType }) {
    return (
        <div className="text-center py-24">
            <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus className="h-6 w-6 text-text-disabled" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
                {filter === 'upcoming' ? 'No upcoming events' : 'No past events'}
            </h3>
            <p className="text-text-muted mb-8 max-w-sm mx-auto">
                {filter === 'upcoming'
                    ? "Your upcoming events will appear here. Create an event to get started."
                    : "Events you've hosted in the past will show up here for your reference."}
            </p>
            {filter === 'upcoming' && (
                <Link href="/create-event">
                    <button className="bg-white text-black px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-gray-200 transition-colors">
                        Create Event
                    </button>
                </Link>
            )}
        </div>
    );
}

function EventsSkeleton() {
    return (
        <div className="space-y-8 mt-4">
            {[1, 2].map((i) => (
                <div key={i} className="flex gap-8">
                    <div className="w-24 shrink-0">
                        <div className="h-5 w-16 bg-bg-hover rounded mb-2" />
                        <div className="h-4 w-12 bg-bg-hover rounded" />
                    </div>
                    <div className="flex-1 bg-bg-elevated h-48 rounded-2xl p-5 border border-white/5 animate-pulse" />
                </div>
            ))}
        </div>
    );
}
