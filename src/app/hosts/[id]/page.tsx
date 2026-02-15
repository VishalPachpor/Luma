'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2,
    Calendar as CalendarIcon,
    MapPin,
    Users,
    LayoutList,
    Grid,
    Search
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/components/ui';
import { useEventsByOrganizer } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import * as userRepo from '@/lib/repositories/user.repository';
import { User } from '@/types';

// New Components
import HostHeader from '@/components/features/hosts/HostHeader';
import HostEventList from '@/components/features/hosts/HostEventList';
import HostCalendarWidget from '@/components/features/hosts/HostCalendarWidget';
import EditHostProfileDialog from '@/components/features/hosts/EditHostProfileDialog';


export default function HostProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { user: currentUser } = useAuth();

    // Unwrapped params
    const resolvedParams = use(params);
    const hostId = resolvedParams.id;

    // Data State
    const [host, setHost] = useState<User | null>(null);
    const [loadingHost, setLoadingHost] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [activeTab, setActiveTab] = useState<'events' | 'calendar' | 'about'>('events');
    const [eventFilter, setEventFilter] = useState<'upcoming' | 'past'>('upcoming');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Default to grid for premium feel
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);


    // Fetch Events 
    const { data: events = [], isLoading: eventsLoading } = useEventsByOrganizer(hostId);

    // Fetch host
    useEffect(() => {
        if (hostId) {
            fetchHost(hostId);
        }
    }, [hostId]);

    const fetchHost = async (id: string) => {
        try {
            const data = await userRepo.findById(id);
            setHost(data);
        } catch (error) {
            console.error('Failed to fetch host:', error);
        } finally {
            setLoadingHost(false);
        }
    };

    // Filter events
    const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());
    const pastEvents = events.filter(e => new Date(e.date) < new Date());
    const timeFiltered = eventFilter === 'upcoming' ? upcomingEvents : pastEvents;

    const displayEvents = timeFiltered.filter(e => {
        if (!searchQuery) return true;
        return e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.location?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Toggle Subscribe (Mock)
    const handleSubscribe = () => {
        setIsSubscribed(!isSubscribed);
    };

    const handleHostUpdate = (updatedHost: User) => {
        setHost(updatedHost);
    };



    if (loadingHost || eventsLoading) {
        return (
            <div className="min-h-screen bg-bg-primary pt-32 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!host) {
        return (
            <div className="min-h-screen bg-bg-primary pt-32 px-6 text-center">
                <h1 className="text-2xl font-bold text-white mb-4">Host Not Found</h1>
                <p className="text-text-secondary">This profile does not exist.</p>
                <Button className="mt-6" onClick={() => router.push('/')}>Go Home</Button>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-bg-primary pb-20 relative overflow-hidden">
            {/* Dynamic Background */}
            {host.coverImage && (
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-bg-primary/90 z-10" />
                    <Image
                        src={host.coverImage}
                        alt=""
                        fill
                        className="object-cover blur-[100px] opacity-40 transform scale-125"
                        priority
                    />
                </div>
            )}

            <div className="relative z-10">
                {/* Edit Dialog */}
                <EditHostProfileDialog
                    host={host}
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    onUpdate={handleHostUpdate}
                />

                <HostHeader
                    host={host}
                    isSubscribed={isSubscribed}
                    onSubscribe={handleSubscribe}
                    isOwner={currentUser?.uid === host.id}
                    onEdit={() => setIsEditOpen(true)}
                />
            </div>
            {/* Navigation Tabs - Full Width Border, Centered Content */}
            <div className="sticky top-0 z-30 bg-bg-primary/95 backdrop-blur-xl border-b border-white/10 mt-8">
                <div className="max-w-5xl mx-auto px-6 flex items-center gap-8 overflow-x-auto no-scrollbar">
                    {['Events', 'About', 'Newsletter', 'Community'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase() as any)}
                            className={`
                        py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                        ${activeTab === tab.toLowerCase()
                                    ? 'border-white text-white'
                                    : 'border-transparent text-white/40 hover:text-white hover:border-white/20'}
                    `}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 pt-8 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
                    <div className="min-w-0">
                        <AnimatePresence mode="wait">
                            {activeTab === 'events' && (
                                <motion.div
                                    key="events"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    {/* Events Header & Categories */}
                                    <div className="mb-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-3xl font-bold text-white">Events</h2>
                                            <div className="flex gap-3">
                                                {/* View Toggles */}
                                                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                                                    <button
                                                        onClick={() => setViewMode('list')}
                                                        className={`p-2 transition-colors rounded ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-text-muted hover:text-white'}`}
                                                    >
                                                        <LayoutList size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setViewMode('grid')}
                                                        className={`p-2 transition-colors rounded ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-text-muted hover:text-white'}`}
                                                    >
                                                        <Grid size={18} />
                                                    </button>
                                                </div>
                                                {/* Search */}
                                                <div className="relative flex items-center">
                                                    {isSearching ? (
                                                        <motion.div
                                                            initial={{ width: 0, opacity: 0 }}
                                                            animate={{ width: 200, opacity: 1 }}
                                                            exit={{ width: 0, opacity: 0 }}
                                                        >
                                                            <input
                                                                autoFocus
                                                                className="bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm text-white placeholder:text-text-muted outline-none focus:border-white/20 w-full"
                                                                placeholder="Search events..."
                                                                value={searchQuery}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                                onBlur={() => !searchQuery && setIsSearching(false)}
                                                            />
                                                        </motion.div>
                                                    ) : (
                                                        <Button
                                                            onClick={() => setIsSearching(true)}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="bg-white/5 border border-white/10 w-10 h-10 p-0 rounded-lg"
                                                        >
                                                            <Search size={18} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Categories (Mock for now) */}
                                        <div className="flex flex-wrap gap-2">
                                            {['All Events', 'Conferences', 'Workshops', 'Parties'].map((cat, i) => (
                                                <button
                                                    key={cat}
                                                    className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${i === 0
                                                        ? 'bg-white text-black border-white'
                                                        : 'bg-transparent text-text-secondary border-white/10 hover:border-white/30 hover:text-white'
                                                        }`}
                                                >
                                                    {cat} {i === 0 && <span className="ml-1 opacity-60">12</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <HostEventList
                                        events={displayEvents}
                                        viewMode={viewMode}
                                        emptyMessage={eventFilter === 'upcoming'
                                            ? "Stay tuned! New events will be announced soon."
                                            : "No past events found."
                                        }
                                    />
                                </motion.div>
                            )}

                            {activeTab === 'about' && (
                                <motion.div>
                                    <div className="bg-white/2 border border-white/5 rounded-2xl p-8">
                                        <h3 className="text-xl font-bold text-white mb-4">About {host.name}</h3>
                                        <p className="text-text-secondary leading-relaxed whitespace-pre-line">
                                            {host.bio || "No bio available."}
                                        </p>

                                        <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">Location</h4>
                                                <div className="flex items-center gap-2 text-white">
                                                    <MapPin className="text-accent" size={18} />
                                                    {host.location || "Global"}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">Community</h4>
                                                <div className="flex items-center gap-2 text-white">
                                                    <Users className="text-accent" size={18} />
                                                    {host.subscriberCount || 0} Subscribers
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Sidebar (Right Column) */}
                    <div className="space-y-6 hidden lg:block sticky top-32 h-fit">
                        {/* No Spacer needed since Tabs are above Grid */}

                        {/* Calendar Widget */}
                        <HostCalendarWidget
                            events={events} // Pass all events to calendar for dots
                            filter={eventFilter}
                            onFilterChange={setEventFilter}
                        />

                        {/* Map Widget Placeholder */}
                        <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-1 aspect-square relative overflow-hidden group">
                            {/* Interactive Map Embed */}
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                scrolling="no"
                                marginHeight={0}
                                marginWidth={0}
                                src={`https://maps.google.com/maps?width=100%25&height=100%25&hl=en&q=${encodeURIComponent(host.location || 'San Francisco')}&t=m&z=12&ie=UTF8&iwloc=B&output=embed`}
                                className="filter grayscale hover:grayscale-0 transition-all duration-500 opacity-80 hover:opacity-100"
                            />
                            <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Button variant="secondary" size="sm" className="bg-black/80 backdrop-blur-md border-white/20 hover:bg-black text-white">
                                    <MapPin size={14} className="mr-2 text-white" />
                                    View Map
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

