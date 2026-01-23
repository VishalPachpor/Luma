/**
 * Unified Search Service
 * 
 * Cross-entity search that powers:
 * - Global search bar
 * - Command palette
 * - Navigation
 * 
 * Features:
 * - Federated search across events, calendars, users
 * - Command matching ("create event", "settings")
 * - Context-aware ranking
 */

import { federatedSearch, searchEvents } from '@/lib/meilisearch/search';
import type { EventDocument, CalendarDocument, UserDocument } from '@/lib/meilisearch/client';

// ============================================================================
// Types
// ============================================================================

export type ResultType = 'event' | 'calendar' | 'user' | 'command' | 'action';

export interface UnifiedSearchResult {
    id: string;
    type: ResultType;
    title: string;
    subtitle?: string;
    icon?: string;
    url?: string;
    action?: () => void;
    metadata?: Record<string, unknown>;
    score: number;
}

export interface SearchContext {
    userId?: string;
    currentPage?: string;
    recentSearches?: string[];
    permissions?: string[];
}

export interface UnifiedSearchResponse {
    results: UnifiedSearchResult[];
    query: string;
    source: 'meilisearch' | 'postgres';
    processingTimeMs: number;
}

// ============================================================================
// Commands (for Command Palette)
// ============================================================================

interface Command {
    id: string;
    title: string;
    subtitle: string;
    keywords: string[];
    icon: string;
    url?: string;
    shortcut?: string;
    requiresAuth?: boolean;
}

const COMMANDS: Command[] = [
    {
        id: 'create-event',
        title: 'Create Event',
        subtitle: 'Create a new event',
        keywords: ['new', 'add', 'event', 'create'],
        icon: 'plus',
        url: '/create-event',
        shortcut: 'C',
        requiresAuth: true,
    },
    {
        id: 'my-events',
        title: 'My Events',
        subtitle: 'View events you organize',
        keywords: ['events', 'organize', 'hosted', 'my'],
        icon: 'calendar',
        url: '/dashboard/events',
        requiresAuth: true,
    },
    {
        id: 'my-tickets',
        title: 'My Tickets',
        subtitle: 'View events you\'re attending',
        keywords: ['tickets', 'attending', 'registered', 'my'],
        icon: 'ticket',
        url: '/dashboard/tickets',
        requiresAuth: true,
    },
    {
        id: 'explore',
        title: 'Explore Events',
        subtitle: 'Discover events near you',
        keywords: ['explore', 'discover', 'find', 'browse'],
        icon: 'search',
        url: '/explore',
    },
    {
        id: 'settings',
        title: 'Settings',
        subtitle: 'Account and preferences',
        keywords: ['settings', 'preferences', 'account', 'profile'],
        icon: 'settings',
        url: '/settings',
        requiresAuth: true,
    },
    {
        id: 'help',
        title: 'Help & Support',
        subtitle: 'Get help with PlanX',
        keywords: ['help', 'support', 'faq', 'question'],
        icon: 'help',
        url: '/help',
    },
];

// ============================================================================
// Unified Search
// ============================================================================

/**
 * Search across all entities and commands
 */
export async function unifiedSearch(
    query: string,
    context: SearchContext = {}
): Promise<UnifiedSearchResponse> {
    const startTime = Date.now();
    const results: UnifiedSearchResult[] = [];

    // 1. Match commands first (instant, no API call)
    const matchedCommands = matchCommands(query, context);
    results.push(...matchedCommands);

    // 2. Search entities if query is substantive
    if (query.length >= 2) {
        try {
            const federated = await federatedSearch(query, { limit: 8 });

            // Add events
            for (const event of federated.events.hits) {
                results.push({
                    id: event.id,
                    type: 'event',
                    title: event.title,
                    subtitle: event.location || event.city,
                    icon: 'calendar',
                    url: `/events/${event.id}`,
                    metadata: { date: event.date, attendees: event.attendees },
                    score: 80,
                });
            }

            // Add calendars
            for (const calendar of federated.calendars.hits) {
                results.push({
                    id: calendar.id,
                    type: 'calendar',
                    title: calendar.name,
                    subtitle: calendar.description?.slice(0, 50),
                    icon: 'calendar',
                    url: `/calendars/${calendar.id}`,
                    metadata: { followers: calendar.followerCount },
                    score: 70,
                });
            }

            // Add users
            for (const user of federated.users.hits) {
                results.push({
                    id: user.id,
                    type: 'user',
                    title: user.displayName,
                    subtitle: `@${user.username}`,
                    icon: 'user',
                    url: `/${user.username}`,
                    score: 60,
                });
            }
        } catch (error) {
            console.error('[UnifiedSearch] Entity search failed:', error);
        }
    }

    // 3. Sort by score
    results.sort((a, b) => b.score - a.score);

    // 4. Limit results
    const limitedResults = results.slice(0, 12);

    return {
        results: limitedResults,
        query,
        source: 'meilisearch',
        processingTimeMs: Date.now() - startTime,
    };
}

/**
 * Match commands against query
 */
function matchCommands(query: string, context: SearchContext): UnifiedSearchResult[] {
    if (!query || query.length < 1) {
        // Return top commands when no query
        return COMMANDS.slice(0, 4).map(cmd => commandToResult(cmd, 100));
    }

    const lowerQuery = query.toLowerCase();
    const matches: { cmd: Command; score: number }[] = [];

    for (const cmd of COMMANDS) {
        // Skip auth-required commands if not logged in
        if (cmd.requiresAuth && !context.userId) continue;

        let score = 0;

        // Exact title match
        if (cmd.title.toLowerCase().startsWith(lowerQuery)) {
            score = 100;
        }
        // Keyword match
        else if (cmd.keywords.some(kw => kw.startsWith(lowerQuery))) {
            score = 80;
        }
        // Partial match
        else if (cmd.title.toLowerCase().includes(lowerQuery)) {
            score = 50;
        }

        if (score > 0) {
            matches.push({ cmd, score });
        }
    }

    return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(m => commandToResult(m.cmd, m.score));
}

function commandToResult(cmd: Command, score: number): UnifiedSearchResult {
    return {
        id: cmd.id,
        type: 'command',
        title: cmd.title,
        subtitle: cmd.subtitle,
        icon: cmd.icon,
        url: cmd.url,
        metadata: { shortcut: cmd.shortcut },
        score,
    };
}

// ============================================================================
// Quick Actions
// ============================================================================

/**
 * Get quick actions for command palette (no search)
 */
export function getQuickActions(context: SearchContext): UnifiedSearchResult[] {
    return COMMANDS
        .filter(cmd => !cmd.requiresAuth || context.userId)
        .slice(0, 6)
        .map(cmd => commandToResult(cmd, 100));
}
