'use client';
import { generateId, getGoogleMapsUrl } from '@/lib/utils';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Clock, X, Share2, ArrowUpRight, Instagram, Globe, Youtube } from 'lucide-react';
import { Event } from '@/types';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { Button, EventMap } from '@/components/components/ui';

interface EventDetailModalProps {
    events: Event[];
}

export default function EventDetailModal({ events }: EventDetailModalProps) {
    const { selectedEventId, setSelectedEventId } = useStore();
    const event = events.find((e) => e.id === selectedEventId);

    if (!event) return null;

    return (
        <AnimatePresence>
            {selectedEventId && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedEventId(null)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.95 }}
                        className="fixed inset-0 z-101 flex items-center justify-center p-4 sm:p-6 pointer-events-none"
                    >
                        <div className="bg-[#0F1012] w-full max-w-[600px] max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto pointer-events-auto border border-white/10 hide-scrollbar">

                            {/* Header Actions */}
                            <div className="sticky top-0 z-50 flex items-center justify-between p-4 bg-[#0F1012]/80 backdrop-blur-md border-b border-white/5">
                                <div className="flex items-center gap-2">


                                    <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/70">
                                        <Share2 size={16} />
                                    </button>
                                    <Link
                                        href={`/events/${event.id}`}
                                        className="h-8 px-3 flex items-center gap-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium text-white/70"
                                    >
                                        Event Page <ArrowUpRight size={14} />
                                    </Link>
                                </div>
                                <button
                                    onClick={() => setSelectedEventId(null)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/70"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 space-y-8">
                                {/* Cover Image */}
                                <div className="relative aspect-square w-full sm:w-3/4 mx-auto rounded-2xl overflow-hidden shadow-2xl">
                                    <Image
                                        src={event.coverImage}
                                        alt={event.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>

                                {/* Title & Info */}
                                <div>
                                    <h2 className="text-2xl font-bold text-white leading-tight mb-2">
                                        {event.title}
                                    </h2>
                                    <div className="flex items-center gap-2 text-text-secondary text-sm mb-6">
                                        <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center">
                                            <Globe size={12} />
                                        </div>
                                        <span>Presented by <span className="text-white font-medium">R3al World</span></span>
                                    </div>

                                    {/* Date & Location Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">JAN</div>
                                            <div className="text-xl font-bold text-white mb-0.5">12</div>
                                            <div className="text-xs text-text-secondary">Monday, 2:00 PM</div>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col justify-center">
                                            <div className="text-sm font-bold text-white mb-0.5">Menlo Park</div>
                                            <div className="text-xs text-text-secondary">California</div>
                                            <div className="text-[10px] text-blue-400 mt-1 font-medium">Register to See Address</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Registration Box */}
                                <div className="bg-[#1A1B1E] rounded-xl overflow-hidden border border-white/5">
                                    <div className="px-4 py-2 bg-white/5 border-b border-white/5 text-xs font-medium text-text-secondary">
                                        Registration
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                                <Share2 size={14} className="text-white" />
                                            </div>
                                            <div>
                                                <div className="text-sm text-white font-medium">You are invited by IoTeX Team</div>
                                                <div className="text-xs text-text-secondary mt-0.5">We&apos;d love to have you join us.</div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <div className="text-sm text-white mb-2">Welcome! To join the event, please register below.</div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-5 h-5 rounded-full overflow-hidden bg-white/20">
                                                    <Image src={`https://ui-avatars.com/api/?name=${encodeURIComponent('Vishal Patil')}&background=random`} alt="user" width={20} height={20} />
                                                </div>
                                                <span className="text-sm text-text-secondary">vishalpatil080502@gmail.com</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button className="flex-1 bg-white text-black hover:bg-white/90 font-bold rounded-lg h-10">
                                                    Accept Invite
                                                </Button>
                                                <Button variant="secondary" className="px-6 rounded-lg h-10 bg-white/5 hover:bg-white/10 text-text-secondary border-none">
                                                    Decline
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* About Event */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-white">About Event</h3>
                                    <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
                                        <h4 className="font-medium text-white text-base">
                                            {event.about?.[0]}
                                        </h4>
                                        {event.about?.slice(1).map((paragraph, i) => (
                                            <p key={i}>
                                                {paragraph.split(/(\*\*.*?\*\*)/).map((part, index) => {
                                                    if (part.startsWith('**') && part.endsWith('**')) {
                                                        const content = part.slice(2, -2);
                                                        // Simple heuristic for pink text based on content
                                                        const isPink = ['IoTeX', 'Gotvoom by Hofan'].some(k => content.includes(k));
                                                        return <strong key={index} className={isPink ? "text-pink-500" : "text-white"}>{content}</strong>;
                                                    }
                                                    return part;
                                                })}
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                {/* Agenda */}
                                {event.agenda && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-white">The Agenda: No-Fluff Insights</h3>
                                        <div className="space-y-4">
                                            {event.agenda.map((item, index) => (
                                                <div key={index} className="flex gap-3 text-sm">
                                                    <span className="text-text-secondary font-mono pt-0.5">{index + 1}.</span>
                                                    <div className="text-text-secondary">
                                                        <strong className="text-white">{item.title}:</strong> {item.description}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Hosts */}
                                {event.hosts && (
                                    <div className="space-y-6 pt-6 border-t border-white/5">
                                        <h3 className="text-lg font-bold text-white">Hosts</h3>
                                        <div className="space-y-6">
                                            {event.hosts.map((host, i) => (
                                                <div key={i} className="space-y-2">
                                                    <h4 className="text-base font-bold text-white">{host.name}</h4>
                                                    <p className="text-sm text-text-secondary leading-relaxed">
                                                        {host.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Location Map */}
                                <div className="space-y-4 pt-4">
                                    <h3 className="text-lg font-bold text-white">Location</h3>
                                    <p className="text-sm text-text-secondary">
                                        Please register to see the exact location of this event.<br />
                                        <span className="text-white">Menlo Park, California</span>
                                    </p>
                                    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-white/10 bg-[#1C1C1E]">
                                        <EventMap lat={event.coords.lat} lng={event.coords.lng} zoom={13} interactive={false} />
                                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                            <a
                                                href={getGoogleMapsUrl(event.coords.lat, event.coords.lng, event.location)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="pointer-events-auto"
                                            >
                                                <Button variant="secondary" className="bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-black/60">
                                                    View larger map
                                                </Button>
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Tags & Actions */}
                                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                    <div className="flex gap-2">
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-text-secondary"># AI</span>
                                    </div>
                                    <div className="flex gap-4 text-text-muted">
                                        <Globe size={18} className="hover:text-white cursor-pointer" />
                                        <Instagram size={18} className="hover:text-white cursor-pointer" />
                                        <Youtube size={18} className="hover:text-white cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
