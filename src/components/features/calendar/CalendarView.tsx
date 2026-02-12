'use client';

import { Plus, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button, GlossyCard } from '@/components/components/ui';
import { useStore } from '@/store/useStore';
import { useMyCalendars } from '@/hooks/useCalendars';

export default function CalendarView() {
    const { user } = useStore();
    const { data: myCalendars, isLoading } = useMyCalendars(user?.id);

    return (
        <div className="space-y-12 pb-20">
            {/* Page Title */}
            <div>
                <h1 className="text-3xl font-bold text-text-primary mb-2">Calendars</h1>
                <p className="text-text-secondary">Manage your calendars and subscriptions.</p>
            </div>

            {/* My Calendars Section */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-primary">My Calendars</h2>
                    <Link href="/create-calendar">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-text-primary gap-2"
                        >
                            <Plus size={16} />
                            Create
                        </Button>
                    </Link>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myCalendars?.length === 0 && (
                            <GlossyCard className="p-6 flex items-center justify-center border-dashed border-white/10 bg-white/2">
                                <div className="text-center">
                                    <p className="text-text-muted text-sm mb-4">You haven't created any calendars yet.</p>
                                    <Link href="/create-calendar">
                                        <Button variant="secondary" size="sm">Create Your First Calendar</Button>
                                    </Link>
                                </div>
                            </GlossyCard>
                        )}

                        {myCalendars?.map((calendar) => (
                            <GlossyCard
                                key={calendar.id}
                                className="p-6 flex items-center gap-4 hover:border-accent/50 transition-all hover:scale-[1.02] cursor-pointer group bg-bg-elevated"
                            >
                                <div className={`w-16 h-16 rounded-2xl overflow-hidden border border-white/10 group-hover:border-${calendar.color || 'indigo'}-500/50 transition-colors bg-white/5 relative flex items-center justify-center`}>
                                    {calendar.avatarUrl ? (
                                        <Image
                                            src={calendar.avatarUrl}
                                            alt={calendar.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <span className={`text-${calendar.color || 'indigo'}-500 font-bold text-2xl`}>
                                            {calendar.name.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-text-primary mb-1 truncate">
                                        {calendar.name}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                                        <span>{calendar.subscriberCount} Subscribers</span>
                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                        <span>{calendar.isPrivate ? 'Private' : 'Public'}</span>
                                    </div>
                                </div>
                            </GlossyCard>
                        ))}
                    </div>
                )}
            </section>

            {/* Subscribed Calendars Section */}
            <section className="space-y-6">
                <h2 className="text-xl font-bold text-text-primary">Subscribed Calendars</h2>

                {/* Placeholder for subscriptions until endpoint is ready/hook used */}
                <GlossyCard className="p-12 flex flex-col items-center justify-center text-center border-dashed border-white/10 bg-white/2">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-text-muted">
                        <CalendarIcon className="w-8 h-8 text-text-muted" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">No Subscriptions</h3>
                    <p className="text-text-secondary max-w-sm">
                        You have not subscribed to any calendars yet.
                    </p>
                </GlossyCard>
            </section>
        </div>
    );
}
