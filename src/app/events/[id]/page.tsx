import { eventRepository } from '@/lib/repositories';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { MapPin, Calendar, Share2, Globe, Instagram, Youtube, Mic, Monitor, Wine } from 'lucide-react';
import { Button, EventMap } from '@/components/components/ui';
import EventCard from '@/components/features/events/EventCard';
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

            {/* Main Content */}
            <main className="max-w-[1120px] mx-auto pt-24 px-8 pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">

                    {/* Left Column: Fixed 420px Card */}
                    <div className="lg:sticky lg:top-24 self-start">
                        <EventCard event={event} isOrganizer={isOrganizer} />
                    </div>

                    {/* Right Column: Content */}
                    <div className="space-y-12 pl-4">

                        {/* When & Where */}
                        <div>
                            <h2 className="text-[22px] font-semibold text-white mb-6">When and where</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Date Block */}
                                <div className="flex items-center gap-4">
                                    <div className="w-[44px] h-[44px] rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0 border border-white/5">
                                        <Calendar size={20} className="text-white/80" />
                                    </div>
                                    <div>
                                        <div className="text-[15px] font-medium text-white">Date and time</div>
                                        <div className="text-[13px] text-white/60">
                                            {dateString} • {timeString}
                                        </div>
                                    </div>
                                </div>

                                {/* Location Block */}
                                <div className="flex items-center gap-4">
                                    <div className="w-[44px] h-[44px] rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0 border border-white/5">
                                        <MapPin size={20} className="text-white/80" />
                                    </div>
                                    <div>
                                        <div className="text-[15px] font-medium text-white">Location</div>
                                        <div className="text-[13px] text-white/60">
                                            {event.location ? event.location.split(',')[0] : 'See map below'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* About Event */}
                        <section className="space-y-4">
                            <h2 className="text-[22px] font-semibold text-white">About Event</h2>
                            <div className="prose prose-invert prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-gray-400 prose-a:text-blue-400 max-w-none">
                                {event.about ? (
                                    event.about.map((paragraph: string, i: number) => (
                                        <p key={i} className="mb-4">
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
                                    <p className="text-[15px] leading-relaxed text-gray-400 whitespace-pre-line">
                                        {event.description || 'No description provided.'}
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* Location Map */}
                        {event.coords && event.location && (
                            <section className="space-y-4 pt-2">
                                <h2 className="text-[22px] font-semibold text-white">Location</h2>
                                <p className="text-[15px] text-gray-400">{event.location}</p>
                                <div className="relative w-full h-[300px] rounded-2xl overflow-hidden border border-white/10 bg-[#1C1C1E] group shadow-inner">
                                    <EventMap lat={event.coords.lat} lng={event.coords.lng} zoom={13} interactive={false} />
                                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                        <a
                                            href={getGoogleMapsUrl(event.coords.lat, event.coords.lng, event.location)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="pointer-events-auto"
                                        >
                                            <Button variant="secondary" className="bg-[#0B1221] text-white hover:bg-[#151A29] border border-white/10 font-medium text-sm shadow-xl scale-95 group-hover:scale-100 transition-transform h-10 px-6 rounded-xl">
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
