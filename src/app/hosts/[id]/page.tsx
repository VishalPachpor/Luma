'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Calendar,
    MapPin,
    Globe,
    Twitter,
    Instagram,
    Linkedin,
    Users,
    Check,
    Loader2,
    MessageSquarePlus,
    Share2
} from 'lucide-react';
import { GlossyCard, Button } from '@/components/components/ui';
import { useEventsByOrganizer } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import * as userRepo from '@/lib/repositories/user.repository';
import { User, Event } from '@/types';

// Helper to format join date
const formatDate = (dateString?: string) => {
    if (!dateString) return 'recently';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export default function HostProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { user: currentUser } = useAuth();

    // Unwrapped params
    const [hostId, setHostId] = useState<string | null>(null);

    // Data State
    const [host, setHost] = useState<User | null>(null);
    const [loadingHost, setLoadingHost] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

    // Fetch Events (Client-side for now, could be server component later)
    const { data: events = [], isLoading: eventsLoading } = useEventsByOrganizer(hostId || undefined);

    // Unwrap params and fetch host
    useEffect(() => {
        params.then(unwrapped => {
            setHostId(unwrapped.id);
            fetchHost(unwrapped.id);
        });
    }, [params]);

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
    const displayEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

    // Toggle Subscribe (Mock)
    const handleSubscribe = () => {
        setIsSubscribed(!isSubscribed);
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
        <main className="min-h-screen bg-bg-primary pt-24 pb-20">
            {/* Cover Banner (Optional - using abstract pattern for now) */}
            <div className="h-48 w-full bg-gradient-to-r from-indigo-900/20 to-purple-900/20 absolute top-0 left-0 z-0" />

            <div className="max-w-5xl mx-auto px-6 relative z-10">
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
                    {/* Avatar */}
                    <div className="w-32 h-32 rounded-full border-4 border-bg-primary overflow-hidden bg-white/5 shrink-0 relative">
                        <Image
                            src={host.avatar || '/placeholder-avatar.png'}
                            alt={host.name}
                            fill
                            className="object-cover"
                        />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pt-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">{host.name}</h1>
                                <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
                                    <span className="flex items-center gap-1">
                                        <Users size={14} />
                                        {host.subscriberCount || 0} Subscribers
                                    </span>
                                    <span>Joined {formatDate(host.joinedAt)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="secondary"
                                    className="gap-2 bg-white/5 border border-white/10 hover:bg-white/10"
                                >
                                    <Share2 size={16} />
                                </Button>
                                {currentUser?.uid === host.id ? (
                                    <Button
                                        variant="secondary"
                                        onClick={() => router.push('/settings')}
                                    >
                                        Edit Profile
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleSubscribe}
                                        className={isSubscribed ? 'bg-white/10 text-white hover:bg-white/20' : ''}
                                    >
                                        {isSubscribed ? <><Check size={16} className="mr-2" /> Subscribed</> : 'Subscribe'}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Bio */}
                        <p className="text-text-secondary leading-relaxed max-w-2xl mb-6">
                            {host.bio || `Passionate event organizer sharing unique experiences on Pulse.`}
                        </p>

                        {/* Social Links */}
                        <div className="flex items-center gap-4">
                            {host.socialLinks?.website && (
                                <a href={host.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-white transition-colors">
                                    <Globe size={18} />
                                </a>
                            )}
                            {host.socialLinks?.twitter && (
                                <a href={host.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-blue-400 transition-colors">
                                    <Twitter size={18} />
                                </a>
                            )}
                            {host.socialLinks?.instagram && (
                                <a href={host.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-pink-400 transition-colors">
                                    <Instagram size={18} />
                                </a>
                            )}
                            {host.socialLinks?.linkedin && (
                                <a href={host.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-blue-500 transition-colors">
                                    <Linkedin size={18} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center border-b border-white/10 mb-8">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'upcoming'
                            ? 'text-white'
                            : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        Upcoming
                        {activeTab === 'upcoming' && (
                            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'past'
                            ? 'text-white'
                            : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        Past
                        {activeTab === 'past' && (
                            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                        )}
                    </button>
                </div>

                {/* Submit Event Banner (Luma Style) */}
                <GlossyCard className="mb-10 p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-dashed border-white/10 bg-white/[0.02]">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                            <MessageSquarePlus size={20} className="text-accent" />
                            Community Calendar
                        </h3>
                        <p className="text-text-secondary text-sm max-w-lg">
                            Have an event that fits this calendar? Submit it for review to be featured on {host.name}'s profile.
                        </p>
                    </div>
                    <Button variant="secondary" className="whitespace-nowrap">
                        Submit Event
                    </Button>
                </GlossyCard>

                {/* Event Grid */}
                <div className="grid gap-6">
                    {displayEvents.length === 0 ? (
                        <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
                            <Calendar className="w-12 h-12 text-text-muted mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">
                                No {activeTab} events
                            </h3>
                            <p className="text-text-secondary">
                                {activeTab === 'upcoming'
                                    ? "Stay tuned! New events will be announced soon."
                                    : "No past events found."}
                            </p>
                        </div>
                    ) : (
                        displayEvents.map((event: Event) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -2 }}
                            >
                                <GlossyCard
                                    className="p-0 overflow-hidden group cursor-pointer"
                                    onClick={() => router.push(`/events/${event.id}`)}
                                >
                                    <div className="flex flex-col md:flex-row">
                                        <div className="w-full md:w-64 h-48 md:h-auto relative">
                                            <Image
                                                src={event.coverImage || '/placeholder-event.jpg'}
                                                alt={event.title}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            {/* Date Badge Overlay */}
                                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-center min-w-[50px]">
                                                <div className="text-xs text-text-muted uppercase font-bold">{new Date(event.date).toLocaleString('default', { month: 'short' })}</div>
                                                <div className="text-lg text-white font-bold leading-none">{new Date(event.date).getDate()}</div>
                                            </div>
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col justify-center">
                                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-accent transition-colors">
                                                {event.title}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar size={14} className="text-accent" />
                                                    {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <MapPin size={14} className="text-accent" />
                                                    {event.location}
                                                </span>
                                            </div>
                                            {/* Tags */}
                                            <div className="flex flex-wrap gap-2">
                                                {event.tags.map(tag => (
                                                    <span key={tag} className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-xs text-text-muted">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-6 flex items-center border-t md:border-t-0 md:border-l border-white/5">
                                            <Button variant="secondary" className="w-full md:w-auto">View Details</Button>
                                        </div>
                                    </div>
                                </GlossyCard>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
