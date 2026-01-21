'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, Calendar, User, Sparkles, Compass, Settings, Home, Loader2, ArrowRight, Plus, CircleHelp, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchResult } from '@/types/search';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

// Icon mapping
const Icons: Record<string, any> = {
    Calendar, User, Sparkles, Compass, Settings, Home, Search, Plus, CircleHelp, MessageCircle
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
        shortcuts: SearchResult[];
        hosting: SearchResult[];
        attending: SearchResult[];
        calendars: SearchResult[];
        chats: SearchResult[];
    }>({ events: [], people: [], shortcuts: [], hosting: [], attending: [], calendars: [], chats: [] });

    // Debounce search
    // Debounce search (Run even if query is empty to get defaults)
    useEffect(() => {
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const token = await user?.getIdToken();
                const headers: Record<string, string> = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { headers });
                const data = await res.json();
                console.log('[GlobalSearch] API Response:', data);

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
        }, 300);

        return () => clearTimeout(timer);
    }, [query, user]);

    // Handle selection
    const handleSelect = useCallback((item: SearchResult) => {
        onOpenChange(false);
        router.push(item.url);
    }, [router, onOpenChange]);

    // Keyboard shortcuts handled by parent or self? 
    // Usually component handles Cmd+K if strictly global, 
    // but Navbar handles the explicit button click.
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
            <div className="relative w-full max-w-2xl bg-[#1A1D24] rounded-xl shadow-2xl overflow-hidden border border-white/10 ring-1 ring-white/5 animate-in fade-in zoom-in-95 duration-100">
                <Command
                    shouldFilter={false} // We filter on backend
                    className="w-full text-white"
                >
                    <div className="flex items-center border-b border-white/5 px-4">
                        <Search className="w-5 h-5 text-gray-500 mr-3" />
                        <Command.Input
                            value={query}
                            onValueChange={setQuery}
                            placeholder="Search for events, calendars and more..."
                            className="w-full h-14 bg-transparent outline-none text-[15px] placeholder:text-gray-500 text-white"
                            autoFocus
                        />
                        {loading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                    </div>

                    <Command.List className="max-h-[60vh] overflow-y-auto overflow-x-hidden p-2">
                        {!query && !loading && results.shortcuts.length === 0 && (
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
                                No results found for "{query}"
                            </div>
                        )}


                        {/* Luma Order: Chat -> Calendars -> Hosting -> Attending -> Shortcuts */}

                        {/* Chat Group */}
                        {results.chats.length > 0 && (
                            <Command.Group heading="Chat" className="text-xs font-semibold text-gray-500 px-2 py-1.5 mb-1 select-none">
                                {results.chats.map(item => (
                                    <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                ))}
                            </Command.Group>
                        )}

                        {/* Calendars Group */}
                        {results.calendars.length > 0 && (
                            <Command.Group heading="Calendars" className="text-xs font-semibold text-gray-500 px-2 py-1.5 mb-1 select-none">
                                {results.calendars.map(item => (
                                    <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                ))}
                            </Command.Group>
                        )}

                        {/* Hosting Group */}
                        {results.hosting.length > 0 && (
                            <Command.Group heading="Hosting" className="text-xs font-semibold text-gray-500 px-2 py-1.5 mb-1 select-none">
                                {results.hosting.map(item => (
                                    <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                ))}
                            </Command.Group>
                        )}

                        {/* Attending Group */}
                        {results.attending.length > 0 && (
                            <Command.Group heading="Attending" className="text-xs font-semibold text-gray-500 px-2 py-1.5 mb-1 select-none">
                                {results.attending.map(item => (
                                    <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                ))}
                            </Command.Group>
                        )}

                        {/* Shortcuts Group */}
                        {results.shortcuts.length > 0 && (
                            <Command.Group heading="Shortcuts" className="text-xs font-semibold text-gray-500 px-2 py-1.5 mb-1 select-none">
                                {results.shortcuts.map(item => (
                                    <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                ))}
                            </Command.Group>
                        )}

                        {/* Events Group */}
                        {results.events.length > 0 && (
                            <Command.Group heading="Events" className="text-xs font-semibold text-gray-500 px-2 py-1.5 mb-1 select-none">
                                {results.events.map(item => (
                                    <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                ))}
                            </Command.Group>
                        )}

                        {/* People Group */}
                        {results.people.length > 0 && (
                            <Command.Group heading="People" className="text-xs font-semibold text-gray-500 px-2 py-1.5 mb-1 select-none">
                                {results.people.map(item => (
                                    <CommandItem key={item.id} item={item} onSelect={() => handleSelect(item)} />
                                ))}
                            </Command.Group>
                        )}
                    </Command.List>
                </Command>

                {/* Footer */}
                <div className="bg-white/5 px-4 py-2 flex items-center justify-between text-[11px] text-gray-500 border-t border-white/5">
                    <div className="flex gap-3">
                        <span><kbd className="bg-white/10 px-1 py-0.5 rounded mr-1">↑</kbd><kbd className="bg-white/10 px-1 py-0.5 rounded">↓</kbd> to navigate</span>
                        <span><kbd className="bg-white/10 px-1 py-0.5 rounded mr-1">↵</kbd> to select</span>
                        <span><kbd className="bg-white/10 px-1 py-0.5 rounded mr-1">esc</kbd> to close</span>
                    </div>
                    <span>Federated Search v1.0</span>
                </div>
            </div>
        </div>
    );
}

function CommandItem({ item, onSelect }: { item: SearchResult, onSelect: () => void }) {
    const Icon = item.icon && Icons[item.icon] ? Icons[item.icon] : (item.type === 'event' ? Calendar : (item.type === 'person' ? User : Sparkles));

    return (
        <Command.Item
            onSelect={onSelect}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 aria-selected:bg-indigo-500/20 aria-selected:text-white cursor-pointer transition-colors group"
        >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-gray-400 group-aria-selected:bg-indigo-500 group-aria-selected:text-white transition-colors">
                <Icon size={14} />
            </div>
            <div className="flex-1 flex flex-col">
                <span className="font-medium text-white">{item.title}</span>
                {item.subtitle && <span className="text-xs text-gray-500 group-aria-selected:text-indigo-200">{item.subtitle}</span>}
            </div>
            <ArrowRight size={14} className="opacity-0 group-aria-selected:opacity-100 text-gray-400 transition-opacity" />
        </Command.Item>
    );
}
