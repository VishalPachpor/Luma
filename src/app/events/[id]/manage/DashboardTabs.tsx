'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Users, MessageSquare, BarChart3, LayoutDashboard, Ticket } from 'lucide-react';

interface DashboardTabsProps {
    eventId: string;
}

export function DashboardTabs({ eventId }: DashboardTabsProps) {
    const pathname = usePathname();

    const tabs = [
        { href: `/events/${eventId}/manage/overview`, label: 'Overview' },
        { href: `/events/${eventId}/manage/guests`, label: 'Guests' },
        { href: `/events/${eventId}/manage/registration`, label: 'Registration' },
        { href: `/events/${eventId}/manage/blasts`, label: 'Blasts' },
        { href: `/events/${eventId}/manage/insights`, label: 'Insights' },
        { href: `/events/${eventId}/manage/settings`, label: 'Settings' },
    ];

    return (
        <div className="flex items-center gap-6 mt-6 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
                const isActive = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`px-1 py-3 text-[15px] font-medium border-b-2 transition-colors whitespace-nowrap ${isActive
                            ? 'border-white text-white'
                            : 'border-transparent text-[#888888] hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}
