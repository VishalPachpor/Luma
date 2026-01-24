'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
    Search, Calendar, User, Sparkles, Compass, Settings, Home, Loader2, ArrowRight,
    Plus, CircleHelp, MessageCircle, Copy, LogOut, Sun, Moon, CreditCard, Bell,
    Users, MapPin, Link
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchResult } from '@/types/search';
import { useAuth } from '@/contexts/AuthContext';

// Extended Icon mapping for dynamic DB results
const Icons: Record<string, any> = {
    Calendar, User, Sparkles, Compass, Settings, Home, Search, Plus, CircleHelp,
    MessageCircle, Copy, LogOut, Sun, Moon, CreditCard, Bell, Users, MapPin, Link
};

interface GlobalSearchProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{
        events: SearchResult[];
        people: SearchResult[];
        shortcuts: SearchResult[]; // Includes actions
        hosting: SearchResult[];
        attending: SearchResult[];
        calendars: SearchResult[];
        chats: SearchResult[];
    }>({ events: [], people: [], shortcuts: [], hosting: [], attending: [], calendars: [], chats: [] });

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const token = await user?.getIdToken();
                const headers: Record<string, string> = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { headers });
                const data = await res.json();

                if (data.results) {
                    setResults({
                        events: data.results.events || [],
                        people: data.results.people || [],
                        shortcuts: data.results.shortcuts || [],
                        hosting: data.results.hosting || [],
                        attending: data.results.attending || [],
                        calendars: data.results.calendars || [],
                        chats: data.results.chats || []
                    });
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        }, 200); // Faster debounce for snappier feel

        return () => clearTimeout(timer);
    }, [query, user]);

    // Command Bus: Handle selection based on type
    const handleSelect = useCallback((item: SearchResult) => {
        onOpenChange(false);

        // Handle logical actions if we implement them in future (e.g. "theme:toggle")
        if (item.url.startsWith('action:')) {
            console.log('Executing action:', item.url);
            // Implement Action Bus here later
            return;
        }

        router.push(item.url);
    }, [router, onOpenChange]);

    // Keyboard shortcut listener
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onOpenChange(!open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [open, onOpenChange]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => onOpenChange(false)}
            />

            {/* Command Palette */}
            <div className="relative w-full max-w-2xl bg-[#1A1D24] rounded-xl shadow-2xl overflow-hidden border border-white/10 ring-1 ring-white/5 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[70vh]">
                <Command
                    shouldFilter={false} // Backend filtering
                    className="w-full h-full flex flex-col text-white bg-transparent"
                >
                    <div className="flex items-center border-b border-white/5 px-4 shrink-0">
                        <Search className="w-5 h-5 text-gray-500 mr-3" />
                        <Command.Input
                            value={query}
                            onValueChange={setQuery}
                            placeholder="Type a command or search..."
                            className="w-full h-14 bg-transparent outline-none text-[15px] placeholder:text-gray-500 text-white"
                            autoFocus
                        />
                        {loading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                    </div>

                    <div className="overflow-y-auto overflow-x-hidden p-2 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                        <Command.List>
                            {!query && !loading && results.shortcuts.length === 0 && results.events.length === 0 && (
                                <div className="py-12 text-center text-sm text-gray-500">
                                    <p className="mb-2">Search events, people, and commands.</p>
                                    <div className="flex items-center justify-center gap-2 text-xs opacity-60">
                                        <kbd className="bg-white/10 px-2 py-1 rounded">⌘</kbd>
                                        <kbd className="bg-white/10 px-2 py-1 rounded">K</kbd>
                                        <span>to open</span>
                                    </div>
                                </div>
                            )}

                            {query && !loading && Object.values(results).flat().length === 0 && (
                                <div className="py-6 text-center text-sm text-gray-500">
                                    No results found for &quot;{query}&quot;
                                </div>
                            )}

                            {/* Order: Chat -> Shortcuts (Actions) -> Calendars -> Hosting/Events -> People */}

                            {/* Chat */}
                            {results.chats.length > 0 && (
                                <Command.Group heading="Recent Chats" className="text-[10px] uppercase font-bold tracking-wider text-gray-500 px-2 py-1.5 mb-1 select-none">
                                    {results.chats.map(item => (
                                        <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                    ))}
                                </Command.Group>
                            )}

                            {/* Shortcuts / Actions */}
                            {results.shortcuts.length > 0 && (
                                <Command.Group heading="Actions" className="text-[10px] uppercase font-bold tracking-wider text-gray-500 px-2 py-1.5 mb-1 select-none">
                                    {results.shortcuts.map(item => (
                                        <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                    ))}
                                </Command.Group>
                            )}

                            {/* Calendars */}
                            {results.calendars.length > 0 && (
                                <Command.Group heading="Calendars" className="text-[10px] uppercase font-bold tracking-wider text-gray-500 px-2 py-1.5 mb-1 select-none">
                                    {results.calendars.map(item => (
                                        <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                    ))}
                                </Command.Group>
                            )}

                            {/* Hosting */}
                            {results.hosting.length > 0 && (
                                <Command.Group heading="Hosting" className="text-[10px] uppercase font-bold tracking-wider text-gray-500 px-2 py-1.5 mb-1 select-none">
                                    {results.hosting.map(item => (
                                        <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                    ))}
                                </Command.Group>
                            )}

                            {/* Events (Search Results) */}
                            {results.events.length > 0 && (
                                <Command.Group heading="Events" className="text-[10px] uppercase font-bold tracking-wider text-gray-500 px-2 py-1.5 mb-1 select-none">
                                    {results.events.map(item => (
                                        <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                    ))}
                                </Command.Group>
                            )}

                            {/* Attending */}
                            {results.attending.length > 0 && (
                                <Command.Group heading="Attending" className="text-[10px] uppercase font-bold tracking-wider text-gray-500 px-2 py-1.5 mb-1 select-none">
                                    {results.attending.map(item => (
                                        <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                    ))}
                                </Command.Group>
                            )}

                            {/* People */}
                            {results.people.length > 0 && (
                                <Command.Group heading="People" className="text-[10px] uppercase font-bold tracking-wider text-gray-500 px-2 py-1.5 mb-1 select-none">
                                    {results.people.map(item => (
                                        <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                    ))}
                                </Command.Group>
                            )}
                        </Command.List>
                    </div>

                    {/* Footer */}
                    <div className="bg-white/5 px-4 py-2 flex items-center justify-between text-[11px] text-gray-500 border-t border-white/5 shrink-0">
                        <div className="flex gap-3">
                            <span><kbd className="bg-white/10 px-1 py-0.5 rounded mr-1">↑</kbd><kbd className="bg-white/10 px-1 py-0.5 rounded">↓</kbd> to navigate</span>
                            <span><kbd className="bg-white/10 px-1 py-0.5 rounded mr-1">↵</kbd> to select</span>
                        </div>
                        <span>Lumma Command v2.0</span>
                    </div>
                </Command>
            </div>
        </div>
    );
}

function CommandItem({ item, onSelect }: { item: SearchResult, onSelect: () => void }) {
    // Dynamic icon resolution
    let Icon = Icons.Search;
    if (item.icon && Icons[item.icon]) {
        Icon = Icons[item.icon];
    } else {
        if (item.type === 'event') Icon = Calendar;
        else if (item.type === 'person') Icon = User;
        else if (item.type === 'calendar') Icon = Users;
        else if (item.type === 'shortcut' || item.type === 'action') Icon = Sparkles;
    }

    return (
        <Command.Item
            onSelect={onSelect}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 aria-selected:bg-indigo-500/20 aria-selected:text-white cursor-pointer transition-colors group"
        >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-gray-400 group-aria-selected:bg-indigo-500 group-aria-selected:text-white transition-colors shrink-0">
                <Icon size={14} />
            </div>
            <div className="flex-1 flex flex-col min-w-0">
                <span className="font-medium text-white truncate">{item.title}</span>
                {item.subtitle && <span className="text-xs text-gray-500 group-aria-selected:text-indigo-200 truncate">{item.subtitle}</span>}
            </div>
            {item.type === 'action' ? (
                <div className="text-[10px] uppercase font-bold bg-white/10 px-1.5 py-0.5 rounded text-gray-400 group-aria-selected:text-white transition-colors">
                    CMD
                </div>
            ) : (
                <ArrowRight size={14} className="opacity-0 group-aria-selected:opacity-100 text-gray-400 transition-opacity" />
            )}
        </Command.Item>
    );
}
