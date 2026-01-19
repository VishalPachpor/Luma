/**
 * Navigation Sidebar Component
 * Left sidebar with navigation items
 */

'use client';

import Image from 'next/image';
import { Tab } from '@/types';
import { useStore } from '@/store/useStore';
import {
    Calendar,
    CalendarCheck,
    Bell,
    Settings,
    LogOut,
    Navigation,
    Globe as GlobeIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const navItems: { id: Tab; icon: typeof GlobeIcon; label: string }[] = [
    { id: 'discovery', icon: GlobeIcon, label: 'Discover' },
    { id: 'myevents', icon: CalendarCheck, label: 'My Events' },
    { id: 'calendar', icon: Calendar, label: 'Calendars' },
    { id: 'alerts', icon: Bell, label: 'Events' },
    { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function NavigationSidebar() {
    const { activeTab, setActiveTab } = useStore();
    const { user, signOut } = useAuth();
    const router = useRouter();

    return (
        <div className="w-20 lg:w-64 h-screen fixed left-0 top-0 border-r border-white/10 bg-bg-primary/40 glass-morphism flex flex-col p-4 z-50">
            {/* Logo */}
            <div className="flex items-center gap-3 px-2 mb-10">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-accent-glow active:scale-90 transition-transform cursor-pointer">
                    <Navigation size={22} className="text-white rotate-45" />
                </div>
                <span className="text-xl font-bold text-text-primary hidden lg:block tracking-tight">
                    Pulse
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300
              ${activeTab === item.id
                                ? 'bg-white/10 text-accent border border-white/5 shadow-glossy scale-[1.02]'
                                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                            }
            `}
                    >
                        <item.icon
                            size={22}
                            strokeWidth={activeTab === item.id ? 2.5 : 2}
                        />
                        <span
                            className={`text-sm font-semibold hidden lg:block ${activeTab === item.id ? 'text-text-primary' : ''
                                }`}
                        >
                            {item.label}
                        </span>
                    </button>
                ))}
            </nav>

            {/* User Profile or Sign In */}
            <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
                {user ? (
                    <>
                        <div className="flex items-center gap-3 px-2 group cursor-pointer">
                            <Image
                                alt="user profile"
                                src={user.photoURL ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'Guest')}&background=random`}
                                width={32}
                                height={32}
                                className="rounded-full border border-white/10 group-hover:scale-110 transition-transform"
                            />
                            <div className="hidden lg:block overflow-hidden">
                                <p className="text-xs font-bold text-text-primary truncate">
                                    {user.displayName || 'User'}
                                </p>
                                <p className="text-[10px] text-text-muted truncate">
                                    {user.email ?? ''}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-text-muted hover:text-red-400 hover:bg-red-400/5 transition-all"
                        >
                            <LogOut size={20} />
                            <span className="text-sm font-semibold hidden lg:block">Log out</span>
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-all border border-accent/20"
                    >
                        <LogOut size={20} className="rotate-180" />
                        <span className="text-sm font-semibold hidden lg:block">Sign In</span>
                    </button>
                )}
            </div>
        </div>
    );
}
