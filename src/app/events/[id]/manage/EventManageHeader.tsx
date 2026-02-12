'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardTabs } from './DashboardTabs';

interface EventManageHeaderProps {
    eventId: string;
    eventTitle: string;
    calendarName: string;
    calendarLink: string;
}

export function EventManageHeader({
    eventId,
    eventTitle,
    calendarName,
    calendarLink
}: EventManageHeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false);
    const bigHeaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // If Big Header is NOT intersecting (scrolled out of view), we are "scrolled"
                // We use a negative rootMargin to trigger earlier/later if needed
                setIsScrolled(!entry.isIntersecting);
            },
            {
                root: null,
                threshold: 0,
                // Trigger when the bottom of the big header passes the top of the viewport (offset by nav height)
                rootMargin: '-80px 0px 0px 0px'
            }
        );

        if (bigHeaderRef.current) {
            observer.observe(bigHeaderRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <>
            {/* Big Header - Scrolls away normally */}
            <div
                ref={bigHeaderRef}
                className="max-w-[800px] mx-auto px-6 pt-8 pb-4"
            >
                <div className="flex flex-col gap-2">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-text-muted text-[13px] font-medium">
                        <Link href={calendarLink} className="hover:text-white transition-colors">
                            {calendarName}
                        </Link>
                        <span className="text-text-disabled">›</span>
                    </div>
                    {/* Title */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-semibold text-white tracking-tight leading-tight">
                            {eventTitle}
                        </h1>
                        {/* Event Page Button */}
                        <div className="flex items-center gap-3">
                            <Link
                                href={`/events/${eventId}`}
                                target="_blank"
                                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all shadow-sm group"
                            >
                                Event Page
                                <ArrowLeft className="w-3 h-3 rotate-135 text-text-muted group-hover:text-white transition-colors" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Header Container */}
            <header
                className={cn(
                    "sticky top-[64px] z-40 transition-all duration-300 ease-out border-b border-transparent bg-bg-primary",
                    isScrolled && "backdrop-blur-xl border-white/5 shadow-lg shadow-black/20"
                )}
            >
                <div className="max-w-[800px] mx-auto px-6 h-[50px] flex items-center justify-between gap-4">
                    {/* Tabs - Always visible, aligned LEFT, no shifting */}
                    <div className="flex-1 flex justify-start min-w-0 overflow-hidden h-full items-end">
                        <DashboardTabs eventId={eventId} />
                    </div>

                    {/* Actions - Fades in on Scroll (Right Side) */}
                    <div
                        className={cn(
                            "flex items-center gap-3 transition-opacity duration-300 ease-in-out shrink-0",
                            isScrolled ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}
                    >
                        {/* Event Page Button - Compact Icon Only */}
                        <Link
                            href={`/events/${eventId}`}
                            target="_blank"
                            className="flex items-center justify-center w-8 h-8 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-all group"
                            title="View Event Page"
                        >
                            <ArrowLeft className="w-4 h-4 rotate-135 text-text-muted group-hover:text-white transition-colors" />
                        </Link>
                    </div>
                </div>
            </header>
        </>
    );
}
