/**
 * Calendars Page Client Component (Luma-style)
 * Two sections: My Calendars + Subscribed Calendars
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Footer } from '@/components/components/layout';
import { Calendar } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface CalendarsPageClientProps {
    cookie: string;
    initialMyCalendars: Calendar[];
    initialSubscribedCalendars: Calendar[];
}

export default function CalendarsPageClient({
    cookie,
    initialMyCalendars = [],
    initialSubscribedCalendars = []
}: CalendarsPageClientProps) {
    const { user } = useAuth();
    const [myCalendars, setMyCalendars] = useState<Calendar[]>(initialMyCalendars);
    const [subscribedCalendars, setSubscribedCalendars] = useState<Calendar[]>(initialSubscribedCalendars);

    // Sync state with props if they change (e.g. revalidation)
    useEffect(() => {
        setMyCalendars(initialMyCalendars);
        setSubscribedCalendars(initialSubscribedCalendars);
    }, [initialMyCalendars, initialSubscribedCalendars]);

    return (
        <div className="flex flex-col min-h-screen bg-[#0E0F13]">
            <main className="flex-1">
                <div className="max-w-[800px] mx-auto px-8 pt-4 pb-10 scroll-mt-16">
                    {/* Page Title */}
                    <h1 className="text-[2rem] font-bold text-white tracking-tight mb-10">
                        Calendars
                    </h1>

                    {/* My Calendars Section */}
                    <section className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-[15px] font-semibold text-white">
                                My Calendars
                            </h2>
                            <Link
                                href="/create-calendar"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 text-white text-[13px] font-medium hover:bg-white/15 transition-colors"
                            >
                                <Plus size={14} />
                                Create
                            </Link>
                        </div>

                        {/* My Calendar Cards */}
                        <div className="space-y-3">
                            {user ? (
                                myCalendars.length > 0 ? (
                                    myCalendars.map((cal) => (
                                        <MyCalendarCard
                                            key={cal.id}
                                            id={cal.id}
                                            name={cal.name}
                                            avatar={cal.avatarUrl || ''}
                                            subscribers={`${cal.subscriberCount} Subscribers`}
                                        />
                                    ))
                                ) : (
                                    <div className="max-w-[260px] p-5 rounded-xl bg-white/2 border border-white/5">
                                        <p className="text-[13px] text-white/40">
                                            You haven't created any calendars yet.
                                        </p>
                                    </div>
                                )
                            ) : (
                                <div className="max-w-[260px] p-5 rounded-xl bg-white/2 border border-white/5">
                                    <p className="text-[13px] text-white/40">
                                        Sign in to see your calendars
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Divider */}
                    <div className="border-t border-white/5 mb-10" />

                    {/* Subscribed Calendars Section */}
                    <section>
                        <h2 className="text-[15px] font-semibold text-white mb-4">
                            Subscribed Calendars
                        </h2>

                        {subscribedCalendars.length === 0 ? (
                            /* Empty State */
                            <div className="max-w-[260px] p-5 rounded-xl bg-white/2 border border-white/5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                        <span className="text-[14px] font-bold text-white/30">0</span>
                                    </div>
                                    <div>
                                        <h3 className="text-[14px] font-semibold text-white">
                                            No Subscriptions
                                        </h3>
                                    </div>
                                </div>
                                <p className="text-[13px] text-white/40">
                                    You have not subscribed to any calendars.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {subscribedCalendars.map((cal, idx) => (
                                    <SubscribedCalendarCard
                                        key={cal.id}
                                        calendar={cal}
                                        index={idx}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}

function MyCalendarCard({
    id,
    name,
    avatar,
    subscribers
}: {
    id: string;
    name: string;
    avatar: string;
    subscribers: string;
}) {
    return (
        <Link href={`/calendar/${id}/manage`}>
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-[260px] p-5 rounded-xl bg-white/2 border border-white/5 hover:bg-white/4 hover:border-white/10 transition-colors cursor-pointer group"
            >
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0 relative">
                        {avatar ? (
                            <Image
                                src={avatar}
                                alt={name}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <CalendarIcon size={16} className="text-white/40" />
                            </div>
                        )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-semibold text-white truncate">
                            {name}
                        </h3>
                        <p className="text-[12px] text-white/40">
                            {subscribers}
                        </p>
                    </div>
                    {/* Manage indicator */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[11px] text-white/50 font-medium">Manage →</span>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}

function SubscribedCalendarCard({
    calendar,
    index
}: {
    calendar: Calendar;
    index: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="max-w-[260px] p-5 rounded-xl bg-white/2 border border-white/5 hover:bg-white/4 transition-colors cursor-pointer"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0 relative">
                    {calendar.avatarUrl ? (
                        <Image
                            src={calendar.avatarUrl}
                            alt={calendar.name}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/10">
                            <CalendarIcon size={16} className="text-white/40" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-semibold text-white truncate">
                        {calendar.name}
                    </h3>
                    <p className="text-[12px] text-white/40">
                        {calendar.subscriberCount} Subscribers
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
