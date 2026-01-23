/**
 * Command Palette Component
 * 
 * Global command palette UI (Cmd+K).
 * Renders search results and quick actions.
 */

'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Calendar,
    Ticket,
    User,
    Settings,
    Plus,
    HelpCircle,
    ChevronRight,
    Command,
    Loader2,
} from 'lucide-react';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import type { UnifiedSearchResult } from '@/lib/search/unified-search';

const ICONS: Record<string, typeof Calendar> = {
    calendar: Calendar,
    ticket: Ticket,
    user: User,
    settings: Settings,
    plus: Plus,
    help: HelpCircle,
    search: Search,
};

export default function CommandPalette() {
    const {
        isOpen,
        close,
        query,
        setQuery,
        results,
        isLoading,
        selectedIndex,
        setSelectedIndex,
        executeResult,
    } = useCommandPalette();

    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const getIcon = (iconName: string) => {
        const Icon = ICONS[iconName] || Search;
        return Icon;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={close}
                    />

                    {/* Palette */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.15 }}
                        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
                    >
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                            {/* Search Input */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                                <Search className="w-5 h-5 text-white/40" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search or type a command..."
                                    className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none text-sm"
                                />
                                {isLoading && <Loader2 className="w-4 h-4 text-white/40 animate-spin" />}
                                <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-white/10 text-[10px] text-white/50 font-mono">
                                    <Command className="w-3 h-3" />K
                                </kbd>
                            </div>

                            {/* Results */}
                            <div className="max-h-[400px] overflow-y-auto">
                                {results.length === 0 && query && !isLoading && (
                                    <div className="px-4 py-8 text-center text-white/40 text-sm">
                                        No results found for "{query}"
                                    </div>
                                )}

                                {results.map((result, index) => {
                                    const Icon = getIcon(result.icon || 'search');
                                    const isSelected = index === selectedIndex;

                                    return (
                                        <div
                                            key={result.id}
                                            onClick={() => executeResult(result)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${result.type === 'command' ? 'bg-indigo-500/20 text-indigo-400' :
                                                result.type === 'event' ? 'bg-green-500/20 text-green-400' :
                                                    result.type === 'calendar' ? 'bg-purple-500/20 text-purple-400' :
                                                        'bg-white/10 text-white/60'
                                                }`}>
                                                <Icon className="w-4 h-4" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-white truncate">
                                                    {result.title}
                                                </div>
                                                {result.subtitle && (
                                                    <div className="text-xs text-white/50 truncate">
                                                        {result.subtitle}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {typeof result.metadata?.shortcut === 'string' && (
                                                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/50 font-mono">
                                                        {result.metadata.shortcut}
                                                    </kbd>
                                                )}
                                                <ChevronRight className="w-4 h-4 text-white/20" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-2 border-t border-white/10 flex items-center gap-4 text-[10px] text-white/40">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 rounded bg-white/10">↑↓</kbd> Navigate
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 rounded bg-white/10">↵</kbd> Select
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 rounded bg-white/10">Esc</kbd> Close
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
