'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, ExternalLink, User, Copy, ArrowUpRight, ChevronsRight, Check, ChevronUp, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Event } from '@/types/event';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef } from 'react';

interface EventDrawerProps {
    event: Event | null;
    isOpen: boolean;
    onClose: () => void;
}

export function EventDrawer({ event, isOpen, onClose }: EventDrawerProps) {
    const { user } = useAuth();
    const [copySuccess, setCopySuccess] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    if (!event) return null;

    const isOrganizer = user?.uid === event.organizerId;

    const handleCopyLink = async () => {
        const eventUrl = `${window.location.origin}/events/${event.id}`;
        await navigator.clipboard.writeText(eventUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleScrollUp = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ top: -300, behavior: 'smooth' });
        }
    };

    const handleScrollDown = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ top: 300, behavior: 'smooth' });
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 z-50"
                    />

                    {/* Drawer */}
                    <motion.div
                        ref={scrollRef}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full md:w-[550px] bg-[#13151A] z-50 overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-[#0E0F13] z-10 border-b border-white/5">
                            <div className="flex items-center justify-between px-4 h-[60px]">
                                <div className="flex items-center gap-3">
                                    {/* Close / Collapse Button */}
                                    <button
                                        onClick={onClose}
                                        className="group w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all"
                                    >
                                        <ChevronsRight size={20} />
                                    </button>

                                    {/* Copy Link */}
                                    <button
                                        onClick={handleCopyLink}
                                        className="h-8 flex items-center gap-2 px-3 bg-white/5 text-white/70 text-xs font-medium rounded-lg hover:bg-white/10 hover:text-white border border-white/5 transition-all"
                                    >
                                        {copySuccess ? <Check size={14} /> : <Copy size={14} />}
                                        <span className="hidden sm:inline">Copy Link</span>
                                    </button>

                                    {/* Event Page */}
                                    <Link
                                        href={`/events/${event.id}`}
                                        className="h-8 flex items-center gap-2 px-3 bg-white/5 text-white/70 text-xs font-medium rounded-lg hover:bg-white/10 hover:text-white border border-white/5 transition-all"
                                    >
                                        <span>Event Page</span>
                                        <ArrowUpRight size={14} />
                                    </Link>
                                </div>

                                {/* Right Controls: Up/Down */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleScrollUp}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        <ChevronUp size={20} />
                                    </button>
                                    <button
                                        onClick={handleScrollDown}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        <ChevronDown size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Manage Access Banner */}
                            {isOrganizer && (
                                <div className="px-6 py-3 bg-[#1C1C1E] border-b border-white/10 flex items-center justify-between">
                                    <p className="text-xs text-white/50">You have manage access</p>
                                    <Link
                                        href={`/events/${event.id}/manage`}
                                        className="text-xs font-medium text-white hover:underline flex items-center gap-1"
                                    >
                                        Manage
                                        <ArrowUpRight size={12} />
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="px-6 py-6">
                            {/* Cover Image */}
                            {event.coverImage && (
                                <div className="w-full h-[280px] rounded-xl overflow-hidden mb-6 bg-white/5 relative">
                                    <Image
                                        src={event.coverImage}
                                        alt={event.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}

                            {/* Title */}
                            <h1 className="text-2xl font-bold text-white mb-4">{event.title}</h1>

                            {/* Host */}
                            <div className="flex items-center gap-2 text-sm text-[#888888] mb-6">
                                <User size={16} />
                                <span>Hosted by {event.organizer}</span>
                            </div>

                            {/* Date & Location */}
                            <div className="flex items-start gap-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex-1">
                                    <div className="flex items-start gap-3 mb-4">
                                        <Calendar size={18} className="text-white mt-0.5 shrink-0" />
                                        <div>
                                            <div className="text-sm font-medium text-white">
                                                {format(new Date(event.date), 'EEEE, MMMM d')}
                                            </div>
                                            <div className="text-sm text-[#888888]">
                                                {format(new Date(event.date), 'h:mm a')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <MapPin size={18} className="text-white mt-0.5 shrink-0" />
                                        <div>
                                            <div className="text-sm font-medium text-white">{event.location}</div>
                                            {event.city && (
                                                <div className="text-sm text-[#888888]">{event.city}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Registration */}
                            <div className="mb-8">
                                <h3 className="text-base font-semibold text-white mb-3">Registration</h3>
                                <p className="text-sm text-[#888888] mb-4">
                                    Welcome! To join the event, please register below.
                                </p>
                                <Link
                                    href={`/events/${event.id}`}
                                    className="block w-full py-3 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors text-center"
                                >
                                    Register for Event
                                </Link>
                            </div>

                            {/* About Event */}
                            {event.description && (
                                <div className="mb-8">
                                    <h3 className="text-base font-semibold text-white mb-3">About Event</h3>
                                    <p className="text-sm text-[#CCCCCC] leading-relaxed whitespace-pre-wrap">
                                        {event.description}
                                    </p>
                                </div>
                            )}

                            {/* Location Map Placeholder */}
                            {event.location && (
                                <div className="mb-8">
                                    <h3 className="text-base font-semibold text-white mb-3">Location</h3>
                                    <div className="text-sm font-medium text-white mb-2">{event.location}</div>
                                    {event.city && (
                                        <div className="text-sm text-[#888888] mb-4">{event.city}</div>
                                    )}
                                    {/* Map placeholder */}
                                    <div className="w-full h-[200px] bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
                                        <span className="text-[#666666] text-sm">Map view</span>
                                    </div>
                                </div>
                            )}

                            {/* Hosted By */}
                            <div className="mb-8">
                                <h3 className="text-base font-semibold text-white mb-3">Hosted By</h3>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden relative">
                                        <Image
                                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(event.organizer || 'Host')}&background=random`}
                                            alt={event.organizer}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">{event.organizer}</div>
                                        <div className="text-xs text-[#888888]">Event Host</div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Host */}
                            <Link
                                href={`/events/${event.id}#contact`}
                                className="block w-full py-3 border border-white/20 text-white text-sm font-medium rounded-lg hover:bg-white/5 transition-colors text-center"
                            >
                                Contact the Host
                            </Link>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
