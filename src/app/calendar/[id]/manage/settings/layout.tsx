/**
 * Settings Layout
 * Luma-style sidebar navigation for calendar settings
 */

'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutTemplate,
    Settings,
    Users,
    Tag,
    Code,
    Globe,
    CreditCard,
    Heart
} from 'lucide-react';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const params = useParams();
    const calendarId = params.id as string;
    const baseUrl = `/calendar/${calendarId}/manage/settings`;

    const navItems = [
        { label: 'Display', href: baseUrl, icon: LayoutTemplate, exact: true },
        { label: 'Options', href: `${baseUrl}/options`, icon: Settings },
        { label: 'Admins', href: `${baseUrl}/admins`, icon: Users },
        { label: 'Tags', href: `${baseUrl}/tags`, icon: Tag, disabled: true },
        { label: 'Embed', href: `${baseUrl}/embed`, icon: Code, disabled: true },
        { label: 'Developer', href: `${baseUrl}/developer`, icon: Code, disabled: true },
        { label: 'Send Limit', href: `${baseUrl}/limits`, icon: Globe, disabled: true },
        { label: 'Luma Plus', href: `${baseUrl}/plus`, icon: Heart, disabled: true },
    ];

    return (
        <div className="flex min-h-[600px]">
            {/* Sidebar */}
            <aside className="w-48 shrink-0 py-8">
                <nav className="flex flex-col space-y-1">
                    {navItems.map((item) => {
                        const isActive = item.exact
                            ? pathname === item.href
                            : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.label}
                                href={item.disabled ? '#' : item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                                    isActive
                                        ? "text-white bg-white/10"
                                        : "text-white/50 hover:text-white hover:bg-white/5",
                                    item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-white/50"
                                )}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Content Area */}
            <div className="flex-1 px-12 py-8 border-l border-white/5">
                <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                </div>
            </div>
        </div>
    );
}
