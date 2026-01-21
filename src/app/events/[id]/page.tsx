import { eventRepository } from '@/lib/repositories';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { MapPin, Calendar, Share2, Globe, Instagram, Youtube, Mic, Monitor, Wine } from 'lucide-react';
import { Button, EventMap } from '@/components/components/ui';
import Link from 'next/link';
import { getGoogleMapsUrl } from '@/lib/utils';
import EventActions from '@/components/features/events/EventActions';
import { ViewTracker } from '@/components/features/analytics/ViewTracker';

interface EventPageProps {
    params: Promise<{
        id: string;
    }>;
}

// Icons mapping for event format
const Icons = {
    mic: Mic,
    handshake: Monitor, // approximating generic icon
    wine: Wine,
} as const;

export default async function EventPage({ params }: EventPageProps) {
    const { id } = await params;
    const event = await eventRepository.findById(id);

    if (!event) {
        notFound();
    }

    // Check if current user is the organizer
    const { createSupabaseServerClient } = await import('@/lib/supabase-server');
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isOrganizer = user?.id === event.organizerId;

    // Format date similar to design
    const startDate = new Date(event.date);
    const dateString = startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
    const timeString = "2:00 PM - 6:00 PM PST"; // Mocked time range to match design

    return (
        <div className="min-h-screen bg-[#0B1221] text-white">
            <ViewTracker eventId={event.id} />
            {/* Navbar Placeholder */}
            <div className="sticky top-0 z-50 h-16 bg-[#0B1221]/80 backdrop-blur-md border-b border-white/5 flex items-center px-6">
                <Link href="/" className="text-white/80 hover:text-white transition-colors">
                    ← Back to Events
                </Link>
            </div>

            <main className="max-w-[1100px] mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-[45%_1fr] gap-12 lg:gap-20">
                    {/* Left Column: Sticky Image */}
                    <div className="lg:sticky lg:top-24 self-start">
                        <div className="relative aspect-square w-full rounded-3xl overflow-hidden shadow-2xl border border-white/5 bg-[#151A29]">
                            {event.coverImage ? (
                                <Image
                                    src={event.coverImage}
                                    alt={event.title || 'Event Cover'}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            ) : (
                                <div className="w-full h-full bg-linear-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                    <Calendar size={64} className="text-white/20" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Content */}
                    <div className="space-y-10">
                        {/* Header Info */}
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight">
                                {event.title}
                            </h1>

                            <div className="space-y-4 pt-2">
                                <div className="flex items-start gap-5">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex flex-col items-center justify-center border border-white/5 shrink-0">
                                        <span className="text-[10px] font-bold text-text-secondary uppercase">
                                            {startDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                                        </span>
                                        <span className="text-lg font-bold text-white">
                                            {startDate.getDate()}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="text-xl font-semibold text-white">{dateString}</div>
                                        <div className="text-text-secondary">{timeString}</div>
                                        {/* Add to Calendar Link could go here */}
                                    </div>
                                </div>

                                <div className="flex items-start gap-5">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 shrink-0">
                                        <MapPin size={24} className="text-text-secondary" />
                                    </div>
                                    <div>
                                        <div className="text-xl font-semibold text-white">
                                            {event.location ? event.location.split(',')[0] : 'Location TBD'}
                                        </div>
                                        <div className="text-text-secondary text-sm">
                                            {event.location || 'Register to see address'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Registration Card - Dynamic RSVP */}
                        <div className="py-2">
                            <EventActions
                                eventId={event.id}
                                eventTitle={event.title}
                                eventDescription={event.description}
                                eventLocation={event.location}
                                eventDate={event.date}
                                organizer={event.organizer}
                                organizerId={event.organizerId}
                                price={event.price || 0}
                                registrationQuestions={event.registrationQuestions}
                                requireApproval={event.requireApproval || false}
                            />
                        </div>

                        {/* Hosted By (Moved here for Luma feel) */}
                        <div className="flex items-center justify-between border-t border-b border-white/5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/5 flex items-center justify-center overflow-hidden">
                                    <span className="text-xs font-bold">{(event.organizer || 'H').charAt(0)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-text-muted uppercase tracking-wider">Hosted By</span>
                                    <span className="font-medium text-white">{event.organizer || 'Host'}</span>
                                </div>
                            </div>
                            <button className="text-xs text-text-muted hover:text-white transition-colors">
                                Contact the Host
                            </button>
                        </div>

                        {/* About Event */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-bold text-white">About Event</h2>
                            <div className="prose prose-invert prose-p:text-gray-300 prose-a:text-blue-400 max-w-none">
                                {event.about ? (
                                    event.about.map((paragraph: string, i: number) => (
                                        <p key={i} className="mb-4 text-base leading-relaxed text-gray-300">
                                            {paragraph.split(/(\*\*.*?\*\*)/).map((part: string, index: number) => {
                                                if (part.startsWith('**') && part.endsWith('**')) {
                                                    const content = part.slice(2, -2);
                                                    return <strong key={index} className="text-white font-semibold">{content}</strong>;
                                                }
                                                return part;
                                            })}
                                        </p>
                                    ))
                                ) : (
                                    <p className="text-base leading-relaxed text-gray-300 whitespace-pre-line">
                                        {event.description || 'No description provided.'}
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* Location Map */}
                        {event.coords && event.location && (
                            <section className="space-y-4 pt-4">
                                <h2 className="text-xl font-bold text-white">Location</h2>
                                <p className="text-gray-400">{event.location}</p>
                                <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-white/10 bg-[#1C1C1E] group">
                                    <EventMap lat={event.coords.lat} lng={event.coords.lng} zoom={13} interactive={false} />
                                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                        <a
                                            href={getGoogleMapsUrl(event.coords.lat, event.coords.lng, event.location)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="pointer-events-auto"
                                        >
                                            <Button variant="secondary" className="bg-[#0B1221] text-white hover:bg-[#151A29] border border-white/10 font-bold shadow-xl scale-95 group-hover:scale-100 transition-transform">
                                                Open in Maps
                                            </Button>
                                        </a>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
