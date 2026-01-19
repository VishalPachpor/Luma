/**
 * Navbar Component (Luma-style)
 * Exact replica of Luma's navigation bar layout
 */

'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Calendar, Compass, Search, Bell, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { ProfileDropdown } from './ProfileDropdown';

const navLinks = [
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/calendars', label: 'Calendars', icon: Calendar },
    { href: '/', label: 'Discover', icon: Compass },
];

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState('');

    // Update time every minute
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
            // Get timezone offset
            const offset = -now.getTimezoneOffset();
            const hours = Math.floor(Math.abs(offset) / 60);
            const mins = Math.abs(offset) % 60;
            const sign = offset >= 0 ? '+' : '-';
            const tz = `GMT${sign}${hours}${mins > 0 ? ':' + mins.toString().padStart(2, '0') : ''}`;
            setCurrentTime(`${timeStr} ${tz}`);
        };

        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="fixed top-0 left-0 right-0 z-50">
            <nav className="bg-[#13151A]/95 border-b border-white/5">
                <div className="w-full max-w-[1920px] mx-auto px-6 h-12 flex items-center justify-between relative">
                    {/* Left: Logo */}
                    <div className="flex items-center shrink-0">
                        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                            <Sparkles
                                size={18}
                                className="text-white fill-white"
                            />
                        </Link>
                    </div>

                    {/* Center: Navigation Links (Absolutely Centered) */}
                    <div className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-1">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href ||
                                (link.href !== '/' && pathname.startsWith(link.href));
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium transition-colors rounded-md ${isActive
                                        ? 'text-white'
                                        : 'text-[#888888] hover:text-[#D4D4D4]'
                                        }`}
                                >
                                    <Icon size={14} className={isActive ? "text-white" : "text-[#666666]"} strokeWidth={2} />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right: Time, Create Event, Search, Notifications, Avatar */}
                    <div className="flex items-center gap-5">
                        {/* Current Time */}
                        <span className="text-[13px] text-[#666666] font-medium tabular-nums hidden xl:block">
                            {currentTime}
                        </span>

                        {/* Create Event Link */}
                        <Link
                            href="/create-event"
                            className="text-[13px] font-medium text-white hover:text-white/80 transition-colors hidden sm:block delay-75"
                        >
                            Create Event
                        </Link>

                        <div className="flex items-center gap-3 ml-1">
                            {/* Search */}
                            <button className="text-[#888888] hover:text-white transition-colors">
                                <Search size={16} strokeWidth={2} />
                            </button>

                            {/* Notifications */}
                            <button className="text-[#888888] hover:text-white transition-colors">
                                <Bell size={16} strokeWidth={2} />
                            </button>

                            {/* User Avatar */}
                            {user ? (
                                <ProfileDropdown />
                            ) : (
                                <button
                                    onClick={() => router.push('/login')}
                                    className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors ml-1"
                                >
                                    <span className="text-[10px] text-white/50">?</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    );
}
