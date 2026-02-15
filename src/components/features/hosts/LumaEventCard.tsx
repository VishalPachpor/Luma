'use client';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import type { Event } from '@/types';

function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

interface LumaEventCardProps {
    event: Event;
}

export default function LumaEventCard({ event }: LumaEventCardProps) {
    const eventDate = new Date(event.date);
    const timeStr = formatTime(eventDate);

    // Fallback image
    const coverImage = event.coverImage || '/images/event-placeholder.jpg';

    const isFree = !event.price || Number(event.price) === 0;

    return (
        <Link
            href={`/events/${event.id}`}
            className="group block relative bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 p-5"
        >
            <div className="flex justify-between gap-6">
                {/* Left Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Time */}
                    <div className="text-sm font-medium text-white/50 mb-1">
                        {timeStr}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-white/90 transition-colors line-clamp-2">
                        {event.title}
                    </h3>

                    {/* Host */}
                    <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
                        {event.hosts?.[0]?.icon ? (
                            <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0">
                                <Image src={event.hosts[0].icon} alt={event.organizer} fill className="object-cover" />
                            </div>
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[10px] text-white shrink-0">
                                {event.organizer.charAt(0)}
                            </div>
                        )}
                        <span className="truncate">By {event.organizer}</span>
                    </div>

                    {/* Location */}
                    {event.location && (
                        <div className="flex items-center gap-1.5 text-sm text-white/60 mb-4">
                            <MapPin size={14} className="text-white/40 shrink-0" />
                            <span className="truncate">{event.location}</span>
                        </div>
                    )}

                    {/* Footer: Tags & Price */}
                    <div className="mt-auto flex items-center gap-3">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                            {event.tags.slice(0, 2).map((tag, i) => (
                                <span
                                    key={i}
                                    className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium border border-indigo-500/10"
                                >
                                    • {tag}
                                </span>
                            ))}
                        </div>

                        {/* Price */}
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${isFree
                            ? 'bg-white/5 text-white/60'
                            : 'bg-green-500/10 text-green-400'
                            }`}>
                            {isFree ? 'Free' : `$${event.price}`}
                        </span>
                    </div>
                </div>

                {/* Right Image */}
                <div className="w-[120px] sm:w-[140px] aspect-square rounded-xl overflow-hidden shrink-0 relative bg-white/5 border border-white/5 self-start">
                    <Image
                        src={coverImage}
                        alt={event.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </div>
            </div>
        </Link>
    );
}
