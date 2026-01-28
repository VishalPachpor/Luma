import { eventRepository } from '@/lib/repositories';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { MapPin, Calendar, ArrowUpRight } from 'lucide-react';
import { Button, EventMap } from '@/components/components/ui';
import Link from 'next/link';
import { getGoogleMapsUrl } from '@/lib/utils';
import { ViewTracker } from '@/components/features/analytics/ViewTracker';
import EventRSVP from '@/components/features/events/EventRSVP';


interface EventPageProps {
    params: Promise<{
        id: string;
    }>;
}

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

    // Date Formatting
    const startDate = new Date(event.date);
    const dateString = startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
    const timeString = startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    // Determine status for UI
    const isPast = event.status === 'ended' || new Date(event.date) < new Date();

    return (
        <div className="min-h-screen bg-[#0E0F13] text-white">
            <ViewTracker eventId={event.id} />

            {/* Navbar */}
            <header className="sticky top-0 z-50 h-16 bg-[#0E0F13]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6">
                <div className="max-w-6xl mx-auto w-full">
                    <Link href="/events" className="text-white/60 hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
                        ← Back to Events
                    </Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto pt-8 px-6 pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-12 lg:gap-20">

                    {/* LEFT COLUMN: Image & Host */}
                    <div className="space-y-8">
                        {/* Cover Image */}
                        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-2xl">
                            {event.coverImage ? (
                                <Image
                                    src={event.coverImage}
                                    alt={event.title}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            ) : (
                                <div className="absolute inset-0 bg-linear-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                    <span className="text-white/20 text-lg">No Image</span>
                                </div>
                            )}
                        </div>

                        {/* Manage Banner */}
                        {isOrganizer && (
                            <div className="bg-[#1C1C1E] border border-white/10 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium text-white">You have manage access</div>
                                    <div className="text-xs text-white/50">Edit details, view guests...</div>
                                </div>
                                <Button size="sm" variant="secondary" className="h-8 text-xs bg-white/10 hover:bg-white/20 border-0 text-white">
                                    Manage ↗
                                </Button>
                            </div>
                        )}

                        {/* Host Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">Hosted By</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                                    {event.organizer.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">{event.organizer}</div>
                                    <div className="text-xs text-white/50">Event Organizer</div>
                                </div>
                            </div>
                            <button className="text-xs text-white/40 hover:text-white transition-colors">
                                Contact the Host
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Details & Registration */}
                    <div className="space-y-10 pt-2">

                        {/* Header Info */}
                        <div className="space-y-6">
                            <h1 className="text-5xl font-bold text-white tracking-tight leading-tight">
                                {event.title}
                            </h1>

                            <div className="space-y-3">
                                {/* Date Row */}
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5 text-white/60">
                                        <div className="flex flex-col items-center leading-none">
                                            <span className="text-[9px] uppercase font-bold">{startDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                                            <span className="text-[14px] font-bold">{startDate.getDate()}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-medium text-white">
                                            {dateString}
                                        </div>
                                        <div className="text-sm text-white/50">
                                            {timeString}
                                        </div>
                                    </div>
                                </div>

                                {/* Location Row */}
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5 text-white/60">
                                        <MapPin size={18} />
                                    </div>
                                    <div>
                                        <Link
                                            href={getGoogleMapsUrl(event.coords.lat, event.coords.lng, event.location)}
                                            target="_blank"
                                            className="text-lg font-medium text-white hover:underline flex items-center gap-1 group"
                                        >
                                            {event.location.split(',')[0]}
                                            <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/50" />
                                        </Link>
                                        <div className="text-sm text-white/50">
                                            {event.city}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Registration Card (Luma Style) */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <span className="text-sm font-medium text-white/60">Registration</span>
                            </div>

                            {isPast ? (
                                <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                        <Calendar size={14} className="text-white/60" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">Past Event</div>
                                        <div className="text-xs text-white/50">This event ended recently.</div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-sm text-white/80 leading-relaxed mb-4">
                                        Welcome! To join the event, please register below.
                                    </div>
                                    <EventRSVP
                                        eventId={event.id}
                                        eventTitle={event.title}
                                        price={event.price || 0}
                                        registrationQuestions={event.registrationQuestions || []}
                                        requireApproval={event.requireApproval || false}
                                        theme="luma"
                                        requireStake={event.requireStake || false}
                                        stakeAmount={event.stakeAmount}
                                        organizerWallet={event.organizerWallet}
                                        eventStartTime={new Date(event.date).getTime() / 1000}
                                    />
                                </>
                            )}
                        </div>

                        {/* About Section */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">About Event</h3>
                            <div className="prose prose-invert prose-p:text-base prose-p:leading-relaxed prose-p:text-white/80">
                                {event.about ? (
                                    event.about.map((p: string, i: number) => <p key={i}>{p}</p>)
                                ) : (
                                    <p>{event.description}</p>
                                )}
                            </div>
                        </div>

                        {/* Location Map */}
                        {event.coords && (
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">Location</h3>
                                <div className="text-lg font-medium text-white">{event.location}</div>
                                <div className="text-sm text-white/50 mb-4">{event.city}</div>

                                <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-white/10 bg-[#1C1C1E]">
                                    <EventMap lat={event.coords.lat} lng={event.coords.lng} zoom={13} interactive={false} />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <a
                                            href={getGoogleMapsUrl(event.coords.lat, event.coords.lng, event.location)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="pointer-events-auto"
                                        >
                                            <Button variant="secondary" className="bg-[#0E0F13]/90 backdrop-blur-md text-white border border-white/10 shadow-xl px-5 py-2 h-auto text-sm rounded-xl hover:bg-black">
                                                Open in Maps
                                            </Button>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div >
    );
}
