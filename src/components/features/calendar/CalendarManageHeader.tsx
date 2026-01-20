'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { CalendarTabs } from '@/components/features/calendar/CalendarTabs';

interface CalendarManageHeaderProps {
    calendarId: string;
    calendarName: string;
}

/**
 * Client component for the calendar manage header
 * STAYS VISIBLE on scroll - moves to top:0 when navbar hides
 * Luma-style: sticky behavior that replaces navbar position
 */
export function CalendarManageHeader({ calendarId, calendarName }: CalendarManageHeaderProps) {
    const [navbarHidden, setNavbarHidden] = useState(false);
    const lastScrollY = useRef(0);

    // Track navbar visibility to adjust our position
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const scrollingDown = currentScrollY > lastScrollY.current;
            const scrolledPastThreshold = currentScrollY > 80;

            if (currentScrollY <= 10) {
                setNavbarHidden(false);
            } else if (scrollingDown && scrolledPastThreshold) {
                setNavbarHidden(true);
            } else if (!scrollingDown) {
                setNavbarHidden(false);
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={cn(
                "border-b border-white/5 bg-[#0E1016]/95 backdrop-blur-md sticky z-40 pt-8 transition-all duration-300",
                navbarHidden ? "top-0" : "top-12" // Move up when navbar hides
            )}
        >
            <div className="max-w-[800px] mx-auto px-8 pb-0">
                {/* Calendar Name */}
                <h1 className="text-4xl font-bold text-white mb-8 tracking-tight">
                    {calendarName}
                </h1>

                {/* Tab Navigation */}
                <nav className="flex gap-8">
                    <CalendarTabs calendarId={calendarId} />
                </nav>
            </div>
        </header>
    );
}
