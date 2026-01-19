/**
 * Header Component
 * Top header with search and view controls
 */

'use client';

import { useStore } from '@/store/useStore';
import { ViewMode } from '@/types';
import { Button } from '@/components/components/ui';
import {
    Search,
    LayoutGrid,
    Globe as GlobeIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/features/notifications/NotificationBell';

export default function Header() {
    const {
        searchQuery,
        setSearchQuery,
        viewMode,
        setViewMode,
        setHostModalOpen,
        activeTab,
    } = useStore();
    const router = useRouter();

    return (
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10">
            <div>
                <h1 className="text-4xl font-bold text-text-primary tracking-tight capitalize">
                    {activeTab === 'discovery' ? 'Discover Events' : activeTab}
                </h1>
                <p className="text-text-secondary mt-1 max-w-2xl text-sm leading-relaxed">
                    {activeTab === 'discovery'
                        ? 'Explore popular events near you, browse by category, or check out some of the great community calendars.'
                        : "Discover what's happening around the world."}
                </p>
            </div>

            <div className="flex flex-wrap md:flex-nowrap items-center gap-3 shrink-0">
                {activeTab === 'discovery' && (
                    <div className="relative group">
                        <Search
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search events, cities..."
                            className="bg-white/5 glass-morphism border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-sm focus:border-accent/50 outline-none w-full md:w-64 transition-all"
                        />
                    </div>
                )}

                {activeTab === 'discovery' && (
                    <div className="flex bg-white/5 glass-morphism p-1 rounded-2xl border border-white/10 shadow-glossy">
                        <button
                            onClick={() => setViewMode(ViewMode.GLOBE)}
                            className={`p-2 rounded-xl transition-all ${viewMode === ViewMode.GLOBE
                                ? 'bg-white/10 text-accent shadow-inner'
                                : 'text-text-muted'
                                }`}
                        >
                            <GlobeIcon size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode(ViewMode.GRID)}
                            className={`p-2 rounded-xl transition-all ${viewMode === ViewMode.GRID
                                ? 'bg-white/10 text-accent shadow-inner'
                                : 'text-text-muted'
                                }`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                )}

                <div className="mr-2">
                    <NotificationBell />
                </div>

                <Button
                    onClick={() => router.push('/create-event')}
                    className="gap-2 h-11 px-8 rounded-full font-bold shadow-accent-glow"
                >
                    Create Event
                </Button>
            </div>
        </header>
    );
}
