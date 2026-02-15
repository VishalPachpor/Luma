'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Event } from '@/types';

function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
}

interface LumaEventRowProps {
    event: Event;
}

export default function LumaEventRow({ event }: LumaEventRowProps) {
    const eventDate = new Date(event.date);
    const timeStr = formatTime(eventDate);

    // Determine free/paid
    const isFree = !event.price || Number(event.price) === 0;

    return (
        <Link
            href={`/events/${event.id}`}
            className="group flex items-start py-3 px-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
            {/* Time (Left) - Top Aligned, Wider Gap */}
            <div className="w-24 pt-0.5 text-base font-normal text-white/50 group-hover:text-white/70 transition-colors shrink-0">
                {timeStr}
            </div>

            {/* Details (Middle) */}
            <div className="flex-1 min-w-0 pr-4">
                {/* Title */}
                <h4 className="text-lg font-bold text-white group-hover:text-white/90 transition-colors leading-tight truncate">
                    {event.title}
                </h4>

                {/* Host Info - Indented under Title */}
                <div className="flex items-center gap-2 mt-1.5">
                    {event.hosts?.[0]?.icon ? (
                        <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0">
                            <Image src={event.hosts[0].icon} alt={event.organizer} fill className="object-cover" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-linear-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[8px] text-white shrink-0">
                            {event.organizer.charAt(0)}
                        </div>
                    )}
                    <span className="text-sm text-white/50 truncate">By {event.organizer}</span>
                </div>
            </div>

            {/* Price (Right) */}
            <div className="shrink-0 pt-0.5">
                <span className={`px-2.5 py-1 rounded-md text-sm font-medium ${isFree
                        ? 'text-white/30'
                        : 'bg-[#183626] text-[#4ADE80]' // Custom darker green bg to match screenshot better
                    }`}>
                    {isFree ? 'Free' : `$${event.price}`}
                </span>
            </div>
        </Link>
    );
}
