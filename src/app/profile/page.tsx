'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Calendar, MapPin, Globe, Twitter, Instagram, Linkedin, Link as LinkIcon } from 'lucide-react';
import { findByOrganizer, findByAttendee } from '@/lib/repositories/event.repository';
import type { Event } from '@/types/event';
import { format } from 'date-fns';
import Link from 'next/link';
import { EventDrawer } from '@/components/features/events/EventDrawer';

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [hostedEvents, setHostedEvents] = useState<Event[]>([]);
    const [attendedEvents, setAttendedEvents] = useState<Event[]>([]);
    const [fetching, setFetching] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }

        async function loadData() {
            if (user?.uid) {
                try {
                    console.log('[ProfilePage] Fetching events for user:', user.uid);
                    console.log('[ProfilePage] User email:', user.email);

                    const [hosted, attended] = await Promise.all([
                        findByOrganizer(user.uid),
                        findByAttendee(user.uid)
                    ]);

                    console.log('[ProfilePage] Hosted events:', hosted);
                    console.log('[ProfilePage] Attended events:', attended);

                    setHostedEvents(hosted);
                    setAttendedEvents(attended);
                } catch (error) {
                    console.error('Error fetching profile data:', error);
                } finally {
                    setFetching(false);
                }
            }
        }

        if (user) {
            loadData();
        }
    }, [user, loading, router]);

    if (loading || fetching) {
        return (
            <div className="min-h-screen bg-[#0B1221] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    if (!user) return null;

    // TODO: Fetch real joined date and social links from a user profile table
    const joinedDate = new Date();

    const upcomingHosted = hostedEvents.filter(e => new Date(e.date) > new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const pastDetails = [...hostedEvents, ...attendedEvents]
        .filter(e => new Date(e.date) < new Date())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleEventClick = (event: Event) => {
        setSelectedEvent(event);
        setIsDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setTimeout(() => setSelectedEvent(null), 300); // Clear after animation
    };

    return (
        <div className="min-h-screen bg-[#13151A] text-white pt-20 pb-20">
            <div className="max-w-3xl mx-auto px-6">
                {/* Profile Header - Left Aligned */}
                <div className="flex items-start gap-6 mb-8">
                    <div className="w-24 h-24 rounded-full overflow-hidden border border-white/10 bg-white/5 shrink-0">
                        <Image
                            src={user.photoURL ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=random&color=fff&size=96`}
                            alt={user.displayName || 'Profile'}
                            width={96}
                            height={96}
                            className="object-cover w-full h-full"
                        />
                    </div>

                    <div className="flex-1 pt-2">
                        <h1 className="text-2xl font-bold mb-0.5">{user.displayName}</h1>
                        <p className="text-sm text-[#888888] mb-3">@{user.email?.split('@')[0]}</p>

                        <div className="flex items-center gap-6 text-[13px] text-[#888888] mb-3">
                            <div className="flex items-center gap-1.5">
                                <Calendar size={13} />
                                <span>Joined {format(joinedDate, 'MMMM yyyy')}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-[13px]">
                            <div>
                                <span className="text-white font-medium">{hostedEvents.length}</span>
                                <span className="text-[#888888] ml-1">Hosted</span>
                            </div>
                            <div>
                                <span className="text-white font-medium">{attendedEvents.length}</span>
                                <span className="text-[#888888] ml-1">Attended</span>
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="flex items-center gap-3 mt-4">
                            <button className="text-[#888888] hover:text-white transition-colors">
                                <div className="w-5 h-5 flex items-center justify-center">
                                    <span className="font-mono text-xs">𝕏</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Hosting Section (Upcoming) */}
                {upcomingHosted.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-xl font-bold mb-5">Hosting</h2>
                        <div className="space-y-4">
                            {upcomingHosted.map((event) => (
                                <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Past Events Section */}
                <div>
                    <h2 className="text-xl font-bold mb-5">Past Events</h2>

                    {pastDetails.length === 0 ? (
                        <div className="text-center py-16 text-[#666666]">
                            <p>No past events</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pastDetails.map((event) => (
                                <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Event Drawer */}
            <EventDrawer
                event={selectedEvent}
                isOpen={isDrawerOpen}
                onClose={handleCloseDrawer}
            />
        </div>
    );
}

interface EventCardProps {
    event: Event;
    onClick: () => void;
}

function EventCard({ event, onClick }: EventCardProps) {
    return (
        <button
            onClick={onClick}
            className="block group w-full text-left"
        >
            <div className="flex gap-4">
                <div className="w-[70px] h-[70px] rounded-lg overflow-hidden bg-white/5 shrink-0 relative">
                    {event.coverImage ? (
                        <Image
                            src={event.coverImage}
                            alt={event.title}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-linear-to-br from-indigo-500/20 to-purple-500/20" />
                    )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="text-[13px] text-[#888888] mb-1">
                        {format(new Date(event.date), 'EEE, MMM d, yyyy, h:mm a')}
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1.5 group-hover:underline">
                        {event.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[13px] text-[#888888]">
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-white/10 overflow-hidden relative">
                                <Image
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(event.organizer || 'Host')}&background=random`}
                                    alt={event.organizer}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <span>By {event.organizer}</span>
                        </div>
                        {event.location && (
                            <>
                                <span>•</span>
                                <span className="truncate">{event.location}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}
