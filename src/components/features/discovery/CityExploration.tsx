/**
 * City Exploration Component (Luma-style)
 * Simple list of cities with colored icons - NO cards, just inline elements
 * With regional tabs: Asia & Pacific, Africa, Europe, etc.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { City, CITIES } from '@/types/city';

// City icons with colors (matching Luma aesthetic)
const cityColors: Record<string, string> = {
    'Singapore': 'bg-purple-500',
    'Bengaluru': 'bg-orange-500',
    'Tokyo': 'bg-pink-500',
    'Tel Aviv-Yafo': 'bg-amber-500',
    'Hong Kong': 'bg-red-500',
    'Mumbai': 'bg-green-500',
    'New Delhi': 'bg-rose-500',
    'Jakarta': 'bg-teal-500',
    'Sydney': 'bg-blue-500',
    'Melbourne': 'bg-indigo-500',
    'Bangkok': 'bg-orange-400',
    'Seoul': 'bg-violet-500',
    'Taipei': 'bg-cyan-500',
    'Manila': 'bg-emerald-500',
    'Kuala Lumpur': 'bg-amber-400',
    'Ho Chi Minh City': 'bg-red-400',
    'Dubai': 'bg-yellow-500',
    'Honolulu': 'bg-sky-500',
    'Brisbane': 'bg-lime-500',
};

const regions = [
    'Asia & Pacific',
    'Africa',
    'Europe',
    'North America',
    'South America',
];

interface CityExplorationProps {
    cities?: City[];
    onCityClick?: (city: City) => void;
}

export default function CityExploration({
    cities = CITIES,
    onCityClick,
}: CityExplorationProps) {
    const [activeRegion, setActiveRegion] = useState('Asia & Pacific');

    return (
        <section>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">
                    Explore Local Events
                </h2>
                <button className="text-[13px] text-white/50 hover:text-white flex items-center gap-1 transition-colors">
                    View All <ChevronRight size={14} />
                </button>
            </div>

            {/* Region Tabs */}
            <div className="flex items-center gap-1 mb-6">
                {regions.map((region) => (
                    <button
                        key={region}
                        onClick={() => setActiveRegion(region)}
                        className={`
                            px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors
                            ${activeRegion === region
                                ? 'bg-white/10 text-white'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                            }
                        `}
                    >
                        {region}
                    </button>
                ))}
            </div>

            {/* City Grid - Just icon + text, NO cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-8 gap-y-4">
                {cities.slice(0, 20).map((city, idx) => {
                    const bgColor = cityColors[city.name] || 'bg-blue-500';
                    return (
                        <motion.button
                            key={city.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.02 }}
                            onClick={() => onCityClick?.(city)}
                            className="flex items-center gap-3 text-left group"
                        >
                            {/* Colored Circle Icon */}
                            <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center shrink-0`}>
                                <span className="text-[10px] font-bold text-white">
                                    {city.name.charAt(0)}
                                </span>
                            </div>
                            {/* City Name + Count */}
                            <div className="min-w-0">
                                <span className="text-[13px] font-medium text-white group-hover:text-white/80 transition-colors block truncate">
                                    {city.name}
                                </span>
                                <span className="text-[11px] text-white/40">
                                    {city.eventCount} Events
                                </span>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </section>
    );
}
