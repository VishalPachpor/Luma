/**
 * Category Discovery Component
 * Browse events by category, featured calendars, and local cities
 */

'use client';

import { motion } from 'framer-motion';
import { Category, FeaturedCalendar } from '@/types';
import { GlossyCard, Button } from '@/components/components/ui';
import CategoryChip from '@/components/components/ui/CategoryChip';
import CityExploration from './CityExploration';
import SubscribableCalendarCard from './SubscribableCalendarCard';
import { useStore } from '@/store/useStore';
import {
    Cpu,
    Utensils,
    BrainCircuit,
    Palette,
    Leaf,
    Dumbbell,
    Sparkles,
    Bitcoin,
    ChevronRight,
    LucideIcon,
} from 'lucide-react';

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
    Cpu,
    Utensils,
    BrainCircuit,
    Palette,
    Leaf,
    Dumbbell,
    Sparkles,
    Bitcoin,
};

interface CategoryDiscoveryProps {
    categories: Category[];
    featuredCalendars: FeaturedCalendar[];
}

export default function CategoryDiscovery({
    categories,
    featuredCalendars,
}: CategoryDiscoveryProps) {
    const { setSelectedCategory, selectedCategory } = useStore();

    return (
        <div className="space-y-12 pb-20">
            {/* Categories Section - 3 Column Grid (Luma-style) */}
            <section>
                <h2 className="text-lg font-semibold text-white mb-6">
                    Browse by Category
                </h2>

                {/* 3-Column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categories.map((cat, idx) => {
                        const IconComponent = iconMap[cat.iconName] || Cpu;
                        const isActive = selectedCategory === cat.id;
                        return (
                            <motion.button
                                key={cat.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03, ease: [0.22, 1, 0.36, 1] }}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`
                                    flex items-center gap-3 px-4 py-3 rounded-xl
                                    border transition-all duration-200 text-left
                                    ${isActive
                                        ? 'bg-white/10 border-white/20'
                                        : 'bg-white/3 border-white/5 hover:bg-white/5 hover:border-white/10'
                                    }
                                `}
                            >
                                <div
                                    className={`w-10 h-10 rounded-xl ${cat.bgColor} flex items-center justify-center shrink-0`}
                                >
                                    <IconComponent size={20} className={cat.color} strokeWidth={1.5} />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[14px] font-medium text-white block truncate">
                                        {cat.name}
                                    </span>
                                    <span className="text-[12px] text-white/40">
                                        {cat.count}
                                    </span>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </section>



            {/* Featured Calendars Section */}
            <section>
                <h2 className="text-lg font-semibold text-white mb-6">
                    Featured Calendars
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {featuredCalendars.map((cal, idx) => (
                        <SubscribableCalendarCard
                            key={cal.id}
                            calendar={cal}
                            index={idx}
                        />
                    ))}
                </div>
            </section>

            {/* City Exploration Section */}
            <CityExploration />
        </div>
    );
}
