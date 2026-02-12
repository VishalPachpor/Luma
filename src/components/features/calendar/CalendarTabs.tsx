'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CalendarTabsProps {
    calendarId: string;
}

const TABS = [
    { name: 'Events', href: 'events' },
    { name: 'People', href: 'people' },
    { name: 'Newsletters', href: 'newsletters' },
    { name: 'Payment', href: 'payment' },
    { name: 'Insights', href: 'insights' },
    { name: 'Settings', href: 'settings' },
] as const;

export function CalendarTabs({ calendarId }: CalendarTabsProps) {
    const pathname = usePathname();

    return (
        <div className="flex gap-8 border-b border-transparent">
            {TABS.map((tab) => {
                const href = `/calendar/${calendarId}/manage/${tab.href}`;
                const isActive = pathname?.startsWith(href);

                return (
                    <Link
                        key={tab.href}
                        href={href}
                        className={cn(
                            "relative pb-3 text-[15px] font-medium transition-colors outline-none",
                            isActive ? "text-white" : "text-text-muted hover:text-text-secondary"
                        )}
                    >
                        {tab.name}
                        {isActive && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-[2px] bg-white"
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        )}
                    </Link>
                );
            })}
        </div>
    );
}
