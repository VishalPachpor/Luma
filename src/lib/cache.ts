/**
 * Cache Utilities
 * Next.js 16 caching helpers with use cache directive
 */

import { unstable_cache } from 'next/cache';

/**
 * Cache tags for granular invalidation
 */
export const CacheTags = {
    EVENTS: 'events',
    CATEGORIES: 'categories',
    USERS: 'users',
    FEATURED: 'featured',
} as const;

/**
 * Default cache configuration
 */
export const cacheConfig = {
    revalidate: 3600, // 1 hour default
    tags: [] as string[],
};

/**
 * Create a cached function with tags
 */
export function createCachedFn<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options: { tags?: string[]; revalidate?: number } = {}
) {
    return unstable_cache(fn, undefined, {
        tags: options.tags || [],
        revalidate: options.revalidate || cacheConfig.revalidate,
    });
}
