import { eventRepository } from '@/lib/repositories';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { MapPin, Calendar, Share2, Globe, Instagram, Youtube, Mic, Monitor, Wine } from 'lucide-react';
import { Button, EventMap } from '@/components/components/ui';
import Link from 'next/link';
import { getGoogleMapsUrl } from '@/lib/utils';
import EventActions from '@/components/features/events/EventActions';

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
            {/* Navbar Placeholder */}
            <div className="sticky top-0 z-50 h-16 bg-[#0B1221]/80 backdrop-blur-md border-b border-white/5 flex items-center px-6">
                <Link href="/" className="text-white/80 hover:text-white transition-colors">
                    ← Back to Events
                </Link>
            </div>

            <main className="max-w-[1200px] mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-[40%_1fr] gap-12 lg:gap-24">
                    {/* Left Column: Sticky Poster & Summary */}
                    <div className="lg:sticky lg:top-24 self-start space-y-8">
                        <div className="relative aspect-square w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                            <Image
                                src={event.coverImage || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80'}
                                alt={event.title || 'Event Cover'}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>

                        <div className="space-y-6">
                            {event.presentedBy && (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                        <Globe size={20} className="text-white/80" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Presented by</div>
                                        <div className="text-lg font-bold text-white flex items-center gap-1 group cursor-pointer hover:text-blue-400 transition-colors">
                                            {event.presentedBy}
                                            <span className="text-white/50 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">›</span>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="secondary" className="ml-auto rounded-full px-4 h-8 text-xs bg-white/5 border-white/10">
                                        Subscribe
                                    </Button>
                                </div>
                            )}

                            <div className="text-sm text-text-secondary leading-relaxed">
                                {event.description ? (
                                    event.description.length > 150
                                        ? `${event.description.substring(0, 150)}...`
                                        : event.description
                                ) : (
                                    `${event.presentedBy} event.`
                                )}
                            </div>

                            <div className="flex gap-4 text-text-muted">
                                {event.socialLinks?.website && (
                                    <a href={event.socialLinks.website} target="_blank" rel="noopener noreferrer">
                                        <Globe size={20} className="hover:text-white cursor-pointer transition-colors" />
                                    </a>
                                )}
                                {event.socialLinks?.twitter && (
                                    <a href={event.socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="hover:text-white cursor-pointer transition-colors">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                    </a>
                                )}
                                {event.socialLinks?.instagram && (
                                    <a href={event.socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                                        <Instagram size={20} className="hover:text-white cursor-pointer transition-colors" />
                                    </a>
                                )}
                                {event.socialLinks?.telegram && (
                                    <a href={event.socialLinks.telegram} target="_blank" rel="noopener noreferrer">
                                        <Share2 size={20} className="hover:text-white cursor-pointer transition-colors" />
                                    </a>
                                )}
                                {event.socialLinks?.discord && (
                                    <a href={event.socialLinks.discord} target="_blank" rel="noopener noreferrer">
                                        <div className="w-5 h-5 flex items-center justify-center hover:text-white cursor-pointer transition-colors">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.42-2.157 2.42zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.42-2.157 2.42z" />
                                            </svg>
                                        </div>
                                    </a>
                                )}
                            </div>

                            <div className="space-y-4 pt-6 border-t border-white/5">
                                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Hosted By</h3>
                                <div className="space-y-3">
                                    <div className="space-y-3">
                                        {event.hosts && event.hosts.length > 0 ? event.hosts.map((host: { name: string; description?: string; icon?: string; role?: string }, i: number) => (
                                            <div key={i} className="flex items-center gap-3 group cursor-pointer">
                                                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/5 flex items-center justify-center overflow-hidden">
                                                    {host.icon ? (
                                                        <Image src={host.icon} alt={host.name} width={32} height={32} />
                                                    ) : (
                                                        <span className="text-xs font-bold">{host.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white group-hover:text-blue-400 transition-colors">{host.name}</div>
                                                    {host.role && <div className="text-xs text-text-muted">{host.role}</div>}
                                                </div>
                                            </div>
                                        )) : (
                                            // Fallback to Organizer if no specific hosts listed
                                            <div className="flex items-center gap-3 group cursor-pointer">
                                                <Link href={`/hosts/${event.organizerId || ''}`} className="flex items-center gap-3 w-full">
                                                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/5 flex items-center justify-center">
                                                        <span className="text-xs font-bold">{(event.organizer || 'H').charAt(0)}</span>
                                                    </div>
                                                    <span className="font-medium text-white group-hover:text-blue-400 transition-colors">{event.organizer || 'Host'}</span>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 space-y-2 text-xs text-text-muted">
                                <div className="hover:text-white cursor-pointer">Contact the Host</div>
                                <div className="hover:text-white cursor-pointer">Report Event</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Content */}
                    <div className="space-y-12">
                        {/* Header Info */}
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight">
                                {event.title}
                            </h1>

                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
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
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 shrink-0">
                                        <MapPin size={24} className="text-text-secondary" />
                                    </div>
                                    <div>
                                        <div className="text-xl font-semibold text-white">
                                            {isOrganizer ? 'Location' : 'Register to See Address'}
                                        </div>
                                        <div className="text-text-secondary">{event.location}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Registration Card - Dynamic RSVP */}
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

                        {/* About Event */}
                        <section className="space-y-6">
                            <h2 className="text-2xl font-bold text-white">About Event</h2>
                            <div className="space-y-4 text-base text-gray-300 leading-relaxed">
                                {event.about ? (
                                    event.about.map((paragraph: string, i: number) => (
                                        <p key={i}>
                                            {paragraph.split(/(\*\*.*?\*\*)/).map((part: string, index: number) => {
                                                if (part.startsWith('**') && part.endsWith('**')) {
                                                    const content = part.slice(2, -2);
                                                    // Matching logic for distinct colors as per screenshot
                                                    const isPink = ['IoTeX', 'Gotvoom by Hofan'].some(k => content.includes(k));
                                                    return <strong key={index} className={isPink ? "text-pink-500" : "text-white"}>{content}</strong>;
                                                }
                                                return part;
                                            })}
                                        </p>
                                    ))
                                ) : (
                                    <p>{event.description}</p>
                                )}
                            </div>
                        </section>

                        {/* Agenda */}
                        {event.agenda && event.agenda.length > 0 && (
                            <section className="space-y-6 pt-8 border-t border-white/5">
                                <h2 className="text-2xl font-bold text-white">The Agenda: No-Fluff Insights</h2>
                                <div className="space-y-6">
                                    {event.agenda.map((item: { title: string; description: string; time?: string }, index: number) => (
                                        <div key={index} className="flex gap-4">
                                            {item.time ? (
                                                <span className="text-gray-500 font-mono text-sm pt-1 min-w-[60px]">{item.time}</span>
                                            ) : (
                                                <span className="text-gray-500 font-mono text-lg">{index + 1}.</span>
                                            )}
                                            <div className="space-y-1">
                                                <h3 className="font-bold text-white text-lg">{item.title}</h3>
                                                <p className="text-gray-400 leading-relaxed">{item.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Who Should Attend */}
                        {event.whoShouldAttend && (
                            <section className="space-y-6 pt-8 border-t border-white/5">
                                <h2 className="text-2xl font-bold text-white">Who Should Attend</h2>
                                <ul className="space-y-3">
                                    {event.whoShouldAttend.map((item: string, i: number) => (
                                        <li key={i} className="flex gap-3 text-gray-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white mt-2.5 shrink-0" />
                                            {item.split(/(\*\*.*?\*\*)/).map((part: string, index: number) => {
                                                if (part.startsWith('**') && part.endsWith('**')) {
                                                    return <strong key={index} className="text-white">{part.slice(2, -2)}</strong>;
                                                }
                                                return part;
                                            })}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* Event Format */}
                        {event.eventFormat && (
                            <section className="space-y-6 pt-8 border-t border-white/5">
                                <h2 className="text-2xl font-bold text-white">Event Format</h2>
                                <ul className="space-y-4">
                                    {event.eventFormat.map((item: { icon: string; title: string; description?: string }, i: number) => {
                                        // Dynamic Icon Loading could be better, simplified for now
                                        const Icon = Icons[item.icon as keyof typeof Icons] || Mic;
                                        return (
                                            <li key={i} className="flex gap-3 text-gray-300">
                                                <Icon size={20} className="mt-1 text-gray-400" />
                                                <div>
                                                    <span className="font-bold text-white">{item.title}</span>
                                                    {item.description && <span className="text-gray-400">: {item.description}</span>}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        )}

                        {/* Hosts Detailed */}
                        {event.hosts && event.hosts.length > 0 && (
                            <section className="space-y-8 pt-8 border-t border-white/5">
                                <h2 className="text-2xl font-bold text-white">Hosts</h2>
                                <div className="space-y-8">
                                    {event.hosts.map((host: { name: string; description?: string; icon?: string }, i: number) => (
                                        <div key={i} className="space-y-3">
                                            <h3 className="text-xl font-bold text-white">{host.name}</h3>
                                            {host.description && <p className="text-gray-300 leading-relaxed">{host.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Location Map */}
                        {event.coords && (
                            <section className="space-y-6 pt-8 border-t border-white/5">
                                <h2 className="text-2xl font-bold text-white">Location</h2>
                                <div className="space-y-1">
                                    <h3 className="font-medium text-white">Please register to see the exact location of this event.</h3>
                                    <p className="text-gray-400">{event.location}</p>
                                </div>
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

                {/* Footer Tag */}
                <div className="mt-20 pt-8 border-t border-white/5 flex gap-2">
                    {event.tags && event.tags.length > 0 ? (
                        event.tags.map((tag: string, i: number) => (
                            <span key={i} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-sm text-text-secondary hover:bg-white/10 cursor-pointer transition-colors">
                                # {tag}
                            </span>
                        ))
                    ) : (
                        <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-sm text-text-secondary hover:bg-white/10 cursor-pointer transition-colors">
                            # Event
                        </span>
                    )}
                </div>
            </main>
        </div>
    );
}
