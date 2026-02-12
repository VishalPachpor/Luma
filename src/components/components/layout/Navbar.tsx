/**
 * Navbar Component (Luma-style)
 * Exact replica of Luma's navigation bar layout
 * Hides on scroll down, shows on scroll up
 * Supports immersive theming - background color syncs with page theme
 */

'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Calendar, Compass, Search, Bell, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileDropdown } from './ProfileDropdown';
import { cn } from '@/lib/utils';
import GlobalSearch from '@/components/features/search/GlobalSearch';
import { useNavbarTheme } from '@/contexts/NavbarThemeContext';

const navLinks = [
    { href: '/', label: 'Events', icon: Calendar },
    { href: '/calendars', label: 'Calendars', icon: Calendar },
    { href: '/discover', label: 'Discover', icon: Compass },
];

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState('');
    const [isVisible, setIsVisible] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const lastScrollY = useRef(0);

    // Get immersive theme color from context
    const { navbarBgColor } = useNavbarTheme();

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

    // Scroll hide behavior
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const scrollingDown = currentScrollY > lastScrollY.current;
            const scrolledPastThreshold = currentScrollY > 80;

            if (currentScrollY <= 10) {
                setIsVisible(true);
            } else if (scrollingDown && scrolledPastThreshold) {
                setIsVisible(false);
            } else if (!scrollingDown) {
                setIsVisible(true);
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Compute navbar background style
    const navbarStyle = navbarBgColor
        ? { backgroundColor: navbarBgColor }
        : undefined;

    return (
        <>
            <header
                className="sticky top-0 z-50"
            >
                <nav
                    className={cn(
                        "backdrop-blur-md transition-colors duration-500",
                        !navbarBgColor && "bg-bg-secondary/95 border-b border-white/5"
                    )}
                    style={navbarStyle}
                >
                    <div className="w-full max-w-[1920px] mx-auto px-6 h-16 flex items-center justify-between relative">
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
                                            : 'text-text-muted hover:text-text-secondary'
                                            }`}
                                    >
                                        <Icon size={14} className={isActive ? "text-white" : "text-text-disabled"} strokeWidth={2} />
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Right: Time, Create Event, Search, Notifications, Avatar */}
                        <div className="flex items-center gap-5">
                            {/* Current Time */}
                            <span className="text-[13px] text-text-disabled font-medium tabular-nums hidden xl:block">
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
                                <button
                                    onClick={() => setIsSearchOpen(true)}
                                    className="text-text-muted hover:text-white transition-colors"
                                >
                                    <Search size={16} strokeWidth={2} />
                                </button>

                                {/* Notifications */}
                                <button className="text-text-muted hover:text-white transition-colors">
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
            <GlobalSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
        </>
    );

}
