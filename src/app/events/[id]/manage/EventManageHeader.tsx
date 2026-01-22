'use client';

/**
 * EventManageHeader Component (Luma-style Progressive Collapsing Header)
 * 
 * Implements a two-stage collapsing header:
 * - Stage 1 (Top): Full header with breadcrumb, title, tabs
 * - Stage 2 (Scrolled): Compact sticky header with title + tabs only
 * 
 * Uses backdrop-filter blur and smooth transitions for premium feel.
 */

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
    const headerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            // Collapse after scrolling 60px
            setIsScrolled(window.scrollY > 60);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Check initial state

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            ref={headerRef}
            className={cn(
                "sticky top-[64px] z-40 transition-all duration-300 ease-out",
                isScrolled
                    ? "bg-[#13151A]/95 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20"
                    : "bg-[#13151A]"
            )}
        >
            <div className="max-w-[800px] mx-auto px-6">
                {/* Main Header Content - Collapses on scroll */}
                <div
                    className={cn(
                        "flex items-center justify-between transition-all duration-300 ease-in-out overflow-hidden",
                        isScrolled
                            ? "max-h-0 opacity-0 -translate-y-4"
                            : "max-h-[200px] opacity-100 translate-y-0 pt-6 pb-4"
                    )}
                >
                    <div className="flex flex-col gap-2">
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-1.5 text-[#888888] text-[13px] font-medium">
                            <Link href={calendarLink} className="hover:text-white transition-colors">
                                {calendarName}
                            </Link>
                            <span className="text-[#444444]">›</span>
                        </div>
                        {/* Title */}
                        <h1 className="text-3xl font-semibold text-white tracking-tight leading-tight">
                            {eventTitle}
                        </h1>
                    </div>

                    {/* Event Page Button */}
                    <div className="flex items-center gap-3 self-end mb-1">
                        <Link
                            href={`/events/${eventId}`}
                            target="_blank"
                            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all shadow-sm group"
                        >
                            Event Page
                            <ArrowLeft className="w-3 h-3 rotate-135 text-[#888888] group-hover:text-white transition-colors" />
                        </Link>
                    </div>
                </div>

                {/* Compact Header - Visible when scrolled */}
                <div
                    className={cn(
                        "flex items-center justify-between transition-all duration-300 ease-in-out overflow-hidden",
                        isScrolled
                            ? "max-h-[48px] opacity-100 translate-y-0 py-2"
                            : "max-h-0 opacity-0 translate-y-4 py-0"
                    )}
                >
                    {/* Compact Title */}
                    <h2 className="text-lg font-semibold text-white truncate max-w-[400px]">
                        {eventTitle}
                    </h2>

                    {/* Event Page Button - Compact */}
                    <Link
                        href={`/events/${eventId}`}
                        target="_blank"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-all group shrink-0"
                    >
                        Event Page
                        <ArrowLeft className="w-3 h-3 rotate-135 text-[#888888] group-hover:text-white transition-colors" />
                    </Link>
                </div>

                {/* Tabs - Always visible, acts as anchor */}
                <DashboardTabs eventId={eventId} />
            </div>
        </header>
    );
}
