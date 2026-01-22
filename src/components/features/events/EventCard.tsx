'use client';

import Image from 'next/image';
import { Share2, MapPin, Calendar, Globe, Mail } from 'lucide-react';
import EventActions from './EventActions';
import { EventVisibility } from './VisibilityToggle';
import { RegistrationQuestion } from '@/types/event';

interface EventCardProps {
    event: {
        id: string;
        title: string;
        description?: string;
        location?: string;
        date: string;
        coverImage?: string;
        organizer?: string;
        organizerId?: string;
        price?: number | null;
        registrationQuestions?: RegistrationQuestion[];
        requireApproval?: boolean;
    };
    isOrganizer: boolean;
}

export default function EventCard({ event, isOrganizer }: EventCardProps) {
    const startDate = new Date(event.date);
    const dateStr = startDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
    const timeStr = startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });

    return (
        <div className="w-full min-h-[520px] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col relative"
            style={{
                background: 'linear-gradient(180deg, rgba(16, 48, 36, 0.95), rgba(10, 30, 24, 0.95))'
            }}
        >
            {/* Cover Image */}
            <div className="relative h-[220px] w-full shrink-0">
                {event.coverImage ? (
                    <Image
                        src={event.coverImage}
                        alt={event.title}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <Calendar size={48} className="text-white/20" />
                    </div>
                )}
            </div>

            {/* Content Container */}
            <div className="flex-1 p-[16px] flex flex-col gap-3">

                {/* Title */}
                <h1 className="text-[20px] font-semibold text-white leading-[1.3]">
                    {event.title}
                </h1>

                {/* Date Row */}
                <div className="flex items-center gap-3">
                    <div className="w-[36px] h-[36px] rounded-[10px] bg-white/10 flex items-center justify-center shrink-0">
                        <Calendar size={16} className="text-white/80" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[13px] text-white/85 font-medium">
                            {dateStr}
                        </span>
                        <span className="text-[11px] text-white/50">
                            {timeStr}
                        </span>
                    </div>
                </div>

                {/* Location Row */}
                <div className="flex items-center gap-3">
                    <div className="w-[36px] h-[36px] rounded-[10px] bg-white/10 flex items-center justify-center shrink-0">
                        <MapPin size={16} className="text-white/80" />
                    </div>
                    <span className="text-[13px] text-white/70 truncate">
                        {event.location || 'Location TBD'}
                    </span>
                </div>

                {/* Registration Block (Soft Inset Panel) */}
                <div className="mt-auto bg-white/[0.06] rounded-xl p-[14px]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex -space-x-2">
                            {/* Mock attendees avatars or host avatar */}
                            <div className="w-7 h-7 rounded-full bg-indigo-500 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                                {(event.organizer || 'H').charAt(0)}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Hosted By</span>
                            <span className="text-[13px] text-white/90 font-medium">{event.organizer || 'Host'}</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <EventActions
                        eventId={event.id}
                        eventTitle={event.title}
                        eventDescription={event.description}
                        eventLocation={event.location}
                        eventDate={event.date}
                        organizer={event.organizer || 'Host'}
                        organizerId={event.organizerId || ''}
                        price={event.price || 0}
                        registrationQuestions={event.registrationQuestions}
                        requireApproval={event.requireApproval || false}
                        fullWidth // Ensure it fills the panel
                        theme="luma" // We'll need to adapt EventActions or just styling
                    />
                </div>
            </div>

            {/* Bottom Link Bar */}
            <div className="h-[44px] bg-black/[0.35] border-t border-white/[0.06] flex items-center px-4 gap-4">
                <button className="flex items-center gap-2 text-[13px] text-white/70 hover:text-white transition-colors">
                    <Share2 size={14} />
                    Share
                </button>
                {event.location && event.location.startsWith('http') && (
                    <a href={event.location} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] text-white/70 hover:text-white transition-colors ml-auto">
                        <Globe size={14} />
                        Link
                    </a>
                )}
            </div>
        </div>
    );
}
