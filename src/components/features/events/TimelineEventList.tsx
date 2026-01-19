'use client';

import { Event } from '@/types';
import TimelineEventCard from '@/components/components/features/events/TimelineEventCard';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';

interface TimelineEventListProps {
    events: Event[];
}

interface GroupedEvents {
    [key: string]: {
        label: string;
        date: Date;
        events: Event[];
    };
}

export default function TimelineEventList({ events }: TimelineEventListProps) {
    const router = useRouter();

    // Group events by date
    const groupedEvents = useMemo(() => {
        const groups: GroupedEvents = {};

        // Sort events by date first
        const sortedEvents = [...events].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        sortedEvents.forEach((event) => {
            const date = new Date(event.date);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

            if (!groups[dateKey]) {
                groups[dateKey] = {
                    label: date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        weekday: 'long',
                    }),
                    date: date,
                    events: [],
                };
            }
            groups[dateKey].events.push(event);
        });

        return Object.values(groups).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [events]);

    return (
        <div className="relative max-w-4xl mx-auto py-10">
            {groupedEvents.map((group, groupIndex) => (
                <div key={groupIndex} className="relative pl-8 md:pl-32 pb-16 last:pb-0">
                    {/* Time Spine Logic */}
                    <div className="absolute left-[9px] md:left-[118px] top-3 bottom-0 w-px bg-white/10 group-last:hidden" />

                    {/* Date Header */}
                    <div className="absolute left-0 md:left-0 top-0 flex flex-col md:items-end w-full md:w-24">
                        <div className="flex items-center gap-3 md:gap-4 md:flex-row-reverse">
                            {/* Dot */}
                            <div className="w-5 h-5 rounded-full border-4 border-bg-primary bg-text-muted shrink-0 relative z-10 shadow-[0_0_0_4px_#0B0C0E]" />

                            {/* Date Label (Desktop: Left, Mobile: Right) */}
                            <div className="text-left md:text-right">
                                <h3 className="text-lg font-bold text-white whitespace-nowrap">
                                    {group.label.split(',')[0]} {/* "Jan 13" */}
                                </h3>
                                <p className="text-sm text-text-muted">
                                    {group.label.split(',')[1]} {/* "Tuesday" */}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Event Cards for this Group */}
                    <div className="space-y-6 mt-1 md:mt-0 pt-10 md:pt-0">
                        {group.events.map((event) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5 }}
                                onClick={() => router.push(`/events/${event.id}`)}
                                className="cursor-pointer"
                            >
                                <TimelineEventCard event={event} />
                            </motion.div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
