'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { UnifiedSearchResult, UnifiedSearchResponse } from '@/lib/search/unified-search';

export interface UseCommandPaletteOptions {
    enabled?: boolean;
}

export interface UseCommandPaletteReturn {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
    query: string;
    setQuery: (query: string) => void;
    results: UnifiedSearchResult[];
    isLoading: boolean;
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
    executeSelected: () => void;
    executeResult: (result: UnifiedSearchResult) => void;
}

export function useCommandPalette(options: UseCommandPaletteOptions = {}): UseCommandPaletteReturn {
    const { enabled = true } = options;
    const router = useRouter();
    const { user } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UnifiedSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Keyboard shortcut
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input field
            const target = e.target as HTMLElement;
            const isInputField = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            // Cmd+K or Ctrl+K (works everywhere)
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }

            // "/" key (only when not typing) - Search-first navigation
            if (e.key === '/' && !isInputField && !isOpen) {
                e.preventDefault();
                setIsOpen(true);
            }

            // Escape
            if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                setIsOpen(false);
            }

            // Arrow navigation
            if (isOpen && results.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    executeSelected();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [enabled, isOpen, results.length, selectedIndex]);

    // Search on query change
    useEffect(() => {
        if (!isOpen) return;

        // Clear previous timer
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Debounce search
        debounceRef.current = setTimeout(async () => {
            await performSearch();
        }, 150);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query, isOpen]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            performSearch();
        }
    }, [isOpen]);

    const performSearch = async () => {
        setIsLoading(true);
        try {
            const token = user ? await user.getIdToken() : undefined;

            // If empty query, combine Recents + API Defaults
            if (!query) {
                const recents = getRecents();
                const res = await fetch(`/api/search/unified?q=`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                if (res.ok) {
                    const data: UnifiedSearchResponse = await res.json();
                    // Deduplicate: Don't show in suggestions if already in recents
                    const recentIds = new Set(recents.map(r => r.id));
                    const suggestions = data.results.filter(r => !recentIds.has(r.id));

                    setResults([...recents, ...suggestions]);
                } else {
                    setResults(recents);
                }
                setSelectedIndex(0);
                return;
            }

            const res = await fetch(`/api/search/unified?q=${encodeURIComponent(query)}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (res.ok) {
                const data: UnifiedSearchResponse = await res.json();
                setResults(data.results);
                setSelectedIndex(0);
            }
        } catch (error) {
            console.error('[CommandPalette] Search failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getRecents = (): UnifiedSearchResult[] => {
        if (typeof window === 'undefined') return [];
        try {
            const stored = localStorage.getItem('cmd_recents');
            if (!stored) return [];
            return JSON.parse(stored).slice(0, 3); // Top 3 recents
        } catch {
            return [];
        }
    };

    const addToRecents = (result: UnifiedSearchResult) => {
        try {
            const current = getRecents();
            // Remove if exists (to move to top)
            const filtered = current.filter(r => r.id !== result.id);
            // Add to top
            const updated = [result, ...filtered].slice(0, 5);
            localStorage.setItem('cmd_recents', JSON.stringify(updated));
        } catch (e) {
            // Ignore storage errors
        }
    };

    const executeResult = useCallback((result: UnifiedSearchResult) => {
        // Add to recents (client-side only)
        addToRecents(result);

        if (result.url) {
            router.push(result.url);
        }
        if (result.action) {
            result.action();
        }
        setIsOpen(false);
    }, [router]);

    const executeSelected = useCallback(() => {
        const selected = results[selectedIndex];
        if (selected) {
            executeResult(selected);
        }
    }, [results, selectedIndex, executeResult]);

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen(prev => !prev),
        query,
        setQuery,
        results,
        isLoading,
        selectedIndex,
        setSelectedIndex,
        executeSelected,
        executeResult,
    };
}
