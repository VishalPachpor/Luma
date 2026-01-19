/**
 * Calendar Selector Component
 * Dropdown for selecting which calendar to add an event to
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronDown, Plus, Check, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar, CalendarColor } from '@/types/calendar';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface CalendarSelectorProps {
    userId: string;
    selectedCalendarId: string | null;
    onSelect: (calendarId: string | null) => void;
    userName?: string;
}

export function CalendarSelector({ userId, selectedCalendarId, onSelect, userName }: CalendarSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [calendars, setCalendars] = useState<Calendar[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newCalendarName, setNewCalendarName] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = createSupabaseBrowserClient();

    // Fetch user's calendars from Supabase
    useEffect(() => {
        if (userId) {
            setIsLoading(true);
            const fetchCalendars = async () => {
                try {
                    const { data, error } = await supabase
                        .from('calendars')
                        .select('*')
                        .eq('owner_id', userId);

                    if (error) {
                        console.error('Failed to fetch calendars:', error);
                        setCalendars([]);
                    } else if (data) {
                        const cals: Calendar[] = data.map((row: any) => ({
                            id: row.id,
                            ownerId: row.owner_id,
                            name: row.name,
                            slug: row.slug,
                            description: row.description,
                            color: (row.color || 'indigo') as CalendarColor,
                            avatarUrl: row.avatar_url,
                            coverUrl: row.cover_url,
                            isPrivate: row.is_private || false,
                            isGlobal: row.is_global || false,
                            location: row.location,
                            subscriberCount: row.subscriber_count || 0,
                            eventCount: row.event_count || 0,
                            createdAt: row.created_at,
                            updatedAt: row.updated_at,
                        }));
                        setCalendars(cals);
                        // Auto-select first calendar if none selected
                        if (!selectedCalendarId && cals.length > 0) {
                            onSelect(cals[0].id);
                        }
                    }
                } finally {
                    setIsLoading(false);
                }
            };
            fetchCalendars();
        }
    }, [userId, supabase]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setIsCreating(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCalendar = calendars.find((c) => c.id === selectedCalendarId);

    const handleCreateCalendar = async () => {
        if (!newCalendarName.trim()) return;

        try {
            const slug = newCalendarName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const { data, error } = await supabase
                .from('calendars')
                .insert({
                    owner_id: userId,
                    name: newCalendarName,
                    slug: slug + '-' + Date.now(),
                    color: 'indigo',
                })
                .select()
                .single();

            if (error) throw error;

            const newCal: Calendar = {
                id: data.id,
                ownerId: data.owner_id,
                name: data.name,
                slug: data.slug,
                color: (data.color || 'indigo') as CalendarColor,
                isPrivate: false,
                isGlobal: false,
                subscriberCount: 0,
                eventCount: 0,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };

            setCalendars((prev) => [...prev, newCal]);
            onSelect(newCal.id);
            setNewCalendarName('');
            setIsCreating(false);
            setIsOpen(false);
        } catch (err) {
            console.error('Failed to create calendar:', err);
        }
    };

    const getCalendarAvatar = (cal: Calendar) => {
        if (cal.avatarUrl) return cal.avatarUrl;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(cal.name)}&background=random&size=32`;
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all"
            >
                {selectedCalendar ? (
                    <>
                        <Image
                            src={getCalendarAvatar(selectedCalendar)}
                            width={20}
                            height={20}
                            className="rounded-full"
                            alt={selectedCalendar.name}
                        />
                        <span className="text-xs font-semibold text-text-primary max-w-[120px] truncate">
                            {selectedCalendar.name}
                        </span>
                    </>
                ) : (
                    <>
                        <CalendarIcon size={16} className="text-text-muted" />
                        <span className="text-xs font-semibold text-text-primary">
                            {isLoading ? 'Loading...' : 'Personal Calendar'}
                        </span>
                    </>
                )}
                <ChevronDown size={14} className={`text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[#2C2C2E] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-white/10">
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest px-2">
                            Your Calendars
                        </p>
                    </div>

                    <div className="max-h-48 overflow-y-auto">
                        {calendars.length === 0 && !isLoading && (
                            <p className="text-xs text-text-muted text-center py-4">
                                No calendars yet
                            </p>
                        )}
                        {calendars.map((cal) => (
                            <button
                                key={cal.id}
                                onClick={() => {
                                    onSelect(cal.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors ${selectedCalendarId === cal.id ? 'bg-white/10' : ''
                                    }`}
                            >
                                <Image
                                    src={getCalendarAvatar(cal)}
                                    width={28}
                                    height={28}
                                    className="rounded-full"
                                    alt={cal.name}
                                />
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-medium text-text-primary">{cal.name}</p>
                                    <p className="text-[10px] text-text-muted">
                                        {cal.eventCount} events • {cal.subscriberCount} subscribers
                                    </p>
                                </div>
                                {selectedCalendarId === cal.id && (
                                    <Check size={16} className="text-accent" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-white/10 p-2">
                        {isCreating ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newCalendarName}
                                    onChange={(e) => setNewCalendarName(e.target.value)}
                                    placeholder="Calendar name..."
                                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateCalendar();
                                        if (e.key === 'Escape') setIsCreating(false);
                                    }}
                                />
                                <button
                                    onClick={handleCreateCalendar}
                                    className="p-1.5 bg-accent rounded-lg text-white hover:bg-accent/80"
                                >
                                    <Check size={14} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
                            >
                                <Plus size={16} />
                                Create New Calendar
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
