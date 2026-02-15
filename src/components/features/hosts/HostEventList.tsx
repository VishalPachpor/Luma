import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import type { Event } from '@/types';
import LumaEventCard from './LumaEventCard';

import LumaEventRow from '../events/LumaEventRow';

interface HostEventListProps {
    events: Event[];
    emptyMessage?: string;
    viewMode?: 'grid' | 'list';
}

export default function HostEventList({ events, emptyMessage = "No events found.", viewMode = 'grid' }: HostEventListProps) {
    if (events.length === 0) {
        return (
            <div className="text-center py-20 bg-white/2 rounded-2xl border border-white/5">
                <Calendar className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                    No events scheduled
                </h3>
                <p className="text-text-secondary">
                    {emptyMessage}
                </p>
            </div>
        );
    }

    // Group events by Date (YYYY-MM-DD)
    const groupedEvents = events.reduce((acc, event) => {
        const date = new Date(event.date);
        const isoDate = date.toISOString().split('T')[0];

        if (!acc[isoDate]) {
            // Format: "Feb 20 Friday"
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            const day = date.getDate();
            const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

            acc[isoDate] = {
                label: `${month} ${day} ${weekday}`,
                dateObj: date,
                events: []
            };
        }
        acc[isoDate].events.push(event);
        return acc;
    }, {} as Record<string, { label: string, dateObj: Date, events: Event[] }>);

    // Sort groups by date
    const sortedGroups = Object.entries(groupedEvents).sort(([dateA], [dateB]) => dateA.localeCompare(dateB));

    if (viewMode === 'list') {
        return (
            <div className="space-y-8 pb-12">
                {sortedGroups.map(([dateKey, group], groupIndex) => {
                    // Robust Date Parsing
                    const dateObj = new Date(dateKey);
                    const datePart = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const dayPart = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                    return (
                        <div key={dateKey}>
                            {/* Date Header: "Feb 20" (White/Bold) "Friday" (Grey/Normal) */}
                            <div className="border-b border-white/10 pb-4 mb-6 flex items-baseline gap-2">
                                <h3 className="text-xl font-bold text-white">
                                    {datePart}
                                </h3>
                                <span className="text-xl text-white/40 font-normal">
                                    {dayPart}
                                </span>
                            </div>

                            {/* List Items */}
                            <div className="flex flex-col">
                                {group.events.map((event, index) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 + groupIndex * 0.1 }}
                                    >
                                        <LumaEventRow event={event} />
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Grid View (Vertical Timeline)
    return (
        <div className="relative pl-8 border-l border-white/10 ml-3 space-y-12 pb-12">
            {sortedGroups.map(([dateKey, group], groupIndex) => {
                // Robust Date Parsing
                const dateObj = new Date(dateKey);
                const datePart = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const dayPart = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                return (
                    <div key={dateKey} className="relative">
                        {/* Date Header Node */}
                        <div className="absolute -left-[37px] top-1.5 w-3 h-3 rounded-full bg-neutral-800 border-2 border-neutral-600 z-10" />

                        {/* Date Header: "Feb 20" (White/Bold) "Friday" (Grey/Normal) */}
                        <div className="mb-6 pl-2 flex items-baseline gap-2">
                            <h3 className="text-xl font-bold text-white">
                                {datePart}
                            </h3>
                            <span className="text-xl text-white/40 font-normal">
                                {dayPart}
                            </span>
                        </div>

                        {/* Grid Items */}
                        <div className="flex flex-col gap-4">
                            {group.events.map((event, index) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 + groupIndex * 0.1 }}
                                >
                                    <LumaEventCard event={event} />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
