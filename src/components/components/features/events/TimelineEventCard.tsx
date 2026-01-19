'use client';

import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { Event } from '@/types';

interface TimelineEventCardProps {
    event: Event;
    status?: 'invited' | 'going' | 'host';
}

export default function TimelineEventCard({ event, status = 'invited' }: TimelineEventCardProps) {
    const startDate = new Date(event.date);

    // Format: 3:30 AM · Jan 12, 2:00 PM PST
    const timeString = startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
    });

    const dateString = startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });

    // Mock end time for display purposes
    const endTimeString = "2:00 PM PST";
    const fullDateString = `${timeString} · ${dateString}, ${endTimeString}`;

    return (
        <div className="group relative bg-surface-1 hover:bg-surface-2 border border-border-default hover:border-border-strong rounded-2xl p-5 flex gap-5 transition-all duration-200">
            {/* Left Content */}
            <div className="flex-1 flex flex-col relative z-10 min-w-0">
                {/* Time - Using Luma's amber/gold accent */}
                <div className="text-time-accent text-[13px] font-medium tracking-wide mb-1.5 font-mono">
                    {fullDateString}
                </div>

                {/* Title */}
                <h3 className="text-[17px] font-bold text-text-primary leading-snug mb-3 group-hover:text-accent-blue transition-colors line-clamp-2">
                    {event.title}
                </h3>

                {/* Host Info */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex -space-x-2">
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-bg-base relative z-10">
                            <Image
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(event.organizer || 'Host')}&background=7B61FF&color=fff`}
                                alt={event.organizer || 'Event Host'}
                                width={20}
                                height={20}
                                className="object-cover"
                            />
                        </div>
                    </div>
                    <span className="text-[13px] text-text-secondary truncate">
                        By <span className="text-text-primary font-medium">{event.organizer || 'Host'}</span>
                    </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-text-muted text-[13px] mb-4">
                    <MapPin size={14} className="text-text-secondary shrink-0" />
                    <span className="truncate">{event.location || 'TBA'}</span>
                </div>

                {/* Status Badge */}
                <div className="mt-auto">
                    {status === 'invited' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-accent-blue/90 text-white hover:bg-accent-blue transition-colors cursor-pointer">
                            Invited
                        </span>
                    )}
                    {status === 'going' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-accent-success/90 text-white hover:bg-accent-success transition-colors cursor-pointer">
                            Going
                        </span>
                    )}
                    {status === 'host' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-accent-primary/90 text-white hover:bg-accent-primary transition-colors cursor-pointer">
                            Hosting
                        </span>
                    )}
                </div>
            </div>

            {/* Right Image */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 relative shrink-0 rounded-xl overflow-hidden bg-surface-2">
                <Image
                    src={event.coverImage || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80'}
                    alt={event.title || 'Event'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
            </div>
        </div>
    );
}

