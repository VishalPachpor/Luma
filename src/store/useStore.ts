/**
 * Zustand Store
 * Global client-side state management
 */

'use client';

import { create } from 'zustand';
import { ViewMode, Tab, User, MOCK_USER } from '@/types';

interface AppState {
    // User state
    user: User | null;
    isAuthenticated: boolean;

    // UI state
    viewMode: ViewMode;
    searchQuery: string;
    activeTab: Tab;
    selectedEventId: string | null;
    activeCity: string | null;
    selectedCategory: string | null;
    isHostModalOpen: boolean;

    // Actions
    setSearchQuery: (query: string) => void;
    setViewMode: (mode: ViewMode) => void;
    setActiveTab: (tab: Tab) => void;
    setSelectedEventId: (id: string | null) => void;
    setActiveCity: (city: string | null) => void;
    setSelectedCategory: (category: string | null) => void;
    setHostModalOpen: (open: boolean) => void;
    login: (user: User) => void;
    logout: () => void;
}

export const useStore = create<AppState>((set) => ({
    // Initial state
    user: null,
    isAuthenticated: false,
    viewMode: ViewMode.GLOBE,
    searchQuery: '',
    activeTab: 'discovery',
    selectedEventId: null,
    activeCity: null,
    selectedCategory: null,
    isHostModalOpen: false,

    // Actions
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setViewMode: (viewMode) => set({ viewMode }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setSelectedEventId: (selectedEventId) => set({ selectedEventId }),
    setActiveCity: (activeCity) => set({ activeCity }),
    setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
    setHostModalOpen: (isHostModalOpen) => set({ isHostModalOpen }),
    login: (user) => set({ user, isAuthenticated: true }),
    logout: () => set({ user: null, isAuthenticated: false }),
}));
