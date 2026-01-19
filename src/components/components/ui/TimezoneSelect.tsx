/**
 * TimezoneSelect Component
 * Dropdown for selecting world timezones
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown, Search } from 'lucide-react';

interface Timezone {
    id: string;
    label: string;
    offset: string;
    city: string;
}

const TIMEZONES: Timezone[] = [
    { id: 'Pacific/Honolulu', label: 'Hawaii', offset: 'GMT-10:00', city: 'Honolulu' },
    { id: 'America/Anchorage', label: 'Alaska', offset: 'GMT-09:00', city: 'Anchorage' },
    { id: 'America/Los_Angeles', label: 'Pacific Time', offset: 'GMT-08:00', city: 'Los Angeles' },
    { id: 'America/Denver', label: 'Mountain Time', offset: 'GMT-07:00', city: 'Denver' },
    { id: 'America/Chicago', label: 'Central Time', offset: 'GMT-06:00', city: 'Chicago' },
    { id: 'America/New_York', label: 'Eastern Time', offset: 'GMT-05:00', city: 'New York' },
    { id: 'America/Sao_Paulo', label: 'Brasilia Time', offset: 'GMT-03:00', city: 'São Paulo' },
    { id: 'Atlantic/Reykjavik', label: 'Greenwich Mean Time', offset: 'GMT+00:00', city: 'Reykjavik' },
    { id: 'Europe/London', label: 'British Time', offset: 'GMT+00:00', city: 'London' },
    { id: 'Europe/Paris', label: 'Central European Time', offset: 'GMT+01:00', city: 'Paris' },
    { id: 'Europe/Berlin', label: 'Central European Time', offset: 'GMT+01:00', city: 'Berlin' },
    { id: 'Europe/Moscow', label: 'Moscow Time', offset: 'GMT+03:00', city: 'Moscow' },
    { id: 'Asia/Dubai', label: 'Gulf Standard Time', offset: 'GMT+04:00', city: 'Dubai' },
    { id: 'Asia/Kolkata', label: 'India Standard Time', offset: 'GMT+05:30', city: 'Kolkata' },
    { id: 'Asia/Bangkok', label: 'Indochina Time', offset: 'GMT+07:00', city: 'Bangkok' },
    { id: 'Asia/Singapore', label: 'Singapore Time', offset: 'GMT+08:00', city: 'Singapore' },
    { id: 'Asia/Shanghai', label: 'China Standard Time', offset: 'GMT+08:00', city: 'Shanghai' },
    { id: 'Asia/Tokyo', label: 'Japan Standard Time', offset: 'GMT+09:00', city: 'Tokyo' },
    { id: 'Australia/Sydney', label: 'Australian Eastern Time', offset: 'GMT+11:00', city: 'Sydney' },
    { id: 'Pacific/Auckland', label: 'New Zealand Time', offset: 'GMT+13:00', city: 'Auckland' },
];

interface TimezoneSelectProps {
    value: string;
    onChange: (timezoneId: string) => void;
}

export default function TimezoneSelect({ value, onChange }: TimezoneSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedTz = TIMEZONES.find((tz) => tz.id === value) || TIMEZONES[13]; // Default to IST

    const filteredTimezones = TIMEZONES.filter(
        (tz) =>
            tz.city.toLowerCase().includes(search.toLowerCase()) ||
            tz.label.toLowerCase().includes(search.toLowerCase()) ||
            tz.offset.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white/5 rounded-2xl border border-white/10 p-4 flex flex-col justify-center gap-1 cursor-pointer hover:bg-white/10 transition-colors text-left"
            >
                <Globe size={16} className="text-text-muted mb-1" />
                <p className="text-xs font-bold text-text-primary">{selectedTz.offset}</p>
                <p className="text-[10px] text-text-muted">{selectedTz.city}</p>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="p-3 border-b border-white/10">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search timezone..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {filteredTimezones.map((tz) => (
                                <button
                                    key={tz.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(tz.id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left ${value === tz.id ? 'bg-accent/10' : ''
                                        }`}
                                >
                                    <div>
                                        <p className="text-sm font-medium text-text-primary">{tz.city}</p>
                                        <p className="text-xs text-text-muted">{tz.label}</p>
                                    </div>
                                    <span className="text-xs text-accent font-mono">{tz.offset}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export { TIMEZONES };
export type { Timezone };
