/**
 * Calendar Repository
 * Supabase-only implementation
 */

import { getServiceSupabase } from '@/lib/supabase';
import type {
    Calendar,
    CreateCalendarInput,
    UpdateCalendarInput,
    CalendarSubscription,
    CreateSubscriptionInput
} from '@/types';
import { generateId } from '@/lib/utils';

// ============================================
// Helper: Transform Supabase row to Calendar
// ============================================

function toCalendar(row: Record<string, unknown>): Calendar {
    return {
        id: row.id as string,
        ownerId: row.owner_id as string,
        name: row.name as string,
        slug: row.slug as string,
        description: row.description as string | undefined,
        color: (row.color as Calendar['color']) || 'indigo',
        avatarUrl: row.avatar_url as string | undefined,
        coverUrl: row.cover_url as string | undefined,
        location: row.location as string | undefined,
        latitude: row.latitude as number | undefined,
        longitude: row.longitude as number | undefined,
        isGlobal: (row.is_global as boolean) || false,
        subscriberCount: (row.subscriber_count as number) || 0,
        eventCount: (row.event_count as number) || 0,
        isPrivate: (row.is_private as boolean) || false,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Create a new calendar
 */
export async function create(input: CreateCalendarInput, ownerId: string): Promise<Calendar> {
    const id = generateId();
    const now = new Date().toISOString();

    const calendar: Calendar = {
        id,
        ownerId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        color: input.color || 'indigo',
        avatarUrl: input.avatarUrl,
        coverUrl: input.coverUrl,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
        isGlobal: input.isGlobal || false,
        subscriberCount: 0,
        eventCount: 0,
        isPrivate: input.isPrivate || false,
        createdAt: now,
        updatedAt: now,
    };

    try {
        const supabase = getServiceSupabase();
        const { error } = await supabase.from('calendars').insert({
            id,
            owner_id: ownerId,
            name: input.name,
            slug: input.slug,
            description: input.description,
            color: input.color || 'indigo',
            avatar_url: input.avatarUrl,
            cover_url: input.coverUrl,
            location: input.location,
            latitude: input.latitude,
            longitude: input.longitude,
            is_global: input.isGlobal || false,
            is_private: input.isPrivate || false,
        });

        if (error) {
            console.error('[CalendarRepo] Supabase create failed:', error);
            throw error;
        }
    } catch (error) {
        console.error('[CalendarRepo] Supabase create exception:', error);
        throw error;
    }

    return calendar;
}

/**
 * Find calendar by ID
 */
export async function findById(id: string): Promise<Calendar | null> {
    if (!id) return null;

    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('calendars')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return null;
        return toCalendar(data);
    } catch (error) {
        console.error('[CalendarRepo] Supabase findById failed:', error);
        return null;
    }
}

/**
 * Find calendar by slug (URL-friendly identifier)
 */
export async function findBySlug(slug: string): Promise<Calendar | null> {
    if (!slug) return null;

    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('calendars')
            .select('*')
            .eq('slug', slug.toLowerCase())
            .single();

        if (error || !data) return null;
        return toCalendar(data);
    } catch (error) {
        console.error('[CalendarRepo] findBySlug failed:', error);
        return null;
    }
}

/**
 * Find popular calendars (featured)
 */
export async function findPopular(limitCount: number = 6): Promise<Calendar[]> {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('calendars')
            .select('*')
            .order('subscriber_count', { ascending: false })
            .limit(limitCount);

        if (error || !data) return [];
        return data.map(toCalendar);
    } catch (error) {
        console.error('[CalendarRepo] Supabase findPopular failed:', error);
        return [];
    }
}

/**
 * Find all calendars owned by a user
 */
export async function findByOwner(ownerId: string): Promise<Calendar[]> {
    if (!ownerId) return [];

    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('calendars')
            .select('*')
            .eq('owner_id', ownerId)
            .order('created_at', { ascending: false });

        if (error || !data) return [];
        return data.map(toCalendar);
    } catch (error) {
        console.error('[CalendarRepo] Supabase findByOwner failed:', error);
        return [];
    }
}

/**
 * Update a calendar
 */
export async function update(id: string, updates: UpdateCalendarInput): Promise<Calendar | null> {
    const existing = await findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();

    try {
        const supabase = getServiceSupabase();
        const supabaseUpdates: Record<string, unknown> = {};

        if (updates.name !== undefined) supabaseUpdates.name = updates.name;
        if (updates.slug !== undefined) supabaseUpdates.slug = updates.slug;
        if (updates.description !== undefined) supabaseUpdates.description = updates.description;
        if (updates.color !== undefined) supabaseUpdates.color = updates.color;
        if (updates.avatarUrl !== undefined) supabaseUpdates.avatar_url = updates.avatarUrl;
        if (updates.coverUrl !== undefined) supabaseUpdates.cover_url = updates.coverUrl;
        if (updates.location !== undefined) supabaseUpdates.location = updates.location;
        if (updates.isGlobal !== undefined) supabaseUpdates.is_global = updates.isGlobal;
        if (updates.isPrivate !== undefined) supabaseUpdates.is_private = updates.isPrivate;

        // Set Updated At
        supabaseUpdates.updated_at = now;

        const { error } = await supabase.from('calendars').update(supabaseUpdates).eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('[CalendarRepo] Supabase update failed:', error);
        throw error;
    }

    return { ...existing, ...updates, updatedAt: now };
}

/**
 * Delete a calendar
 */
export async function remove(id: string): Promise<boolean> {
    try {
        const supabase = getServiceSupabase();
        await supabase.from('calendars').delete().eq('id', id);
    } catch (error) {
        console.error('[CalendarRepo] Supabase delete failed:', error);
        return false;
    }

    return true;
}

/**
 * Check if a slug is available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
    const existing = await findBySlug(slug);
    return !existing;
}

// ============================================
// Subscription Operations
// ============================================

/**
 * Subscribe a user to a calendar
 */
export async function subscribe(
    input: CreateSubscriptionInput,
    userId: string
): Promise<CalendarSubscription> {
    const id = generateId();
    const now = new Date().toISOString();

    const subscription: CalendarSubscription = {
        id,
        calendarId: input.calendarId,
        userId,
        notifyNewEvents: input.notifyNewEvents ?? true,
        notifyReminders: input.notifyReminders ?? true,
        createdAt: now,
    };

    try {
        const supabase = getServiceSupabase();
        await supabase.from('calendar_subscriptions').insert({
            id,
            calendar_id: input.calendarId,
            user_id: userId,
            notify_new_events: input.notifyNewEvents ?? true,
            notify_reminders: input.notifyReminders ?? true,
        });
    } catch (error) {
        console.error('[CalendarRepo] Supabase subscribe failed:', error);
        throw error;
    }

    return subscription;
}

/**
 * Unsubscribe a user from a calendar
 */
export async function unsubscribe(calendarId: string, userId: string): Promise<boolean> {
    try {
        const supabase = getServiceSupabase();
        await supabase
            .from('calendar_subscriptions')
            .delete()
            .eq('calendar_id', calendarId)
            .eq('user_id', userId);
    } catch (error) {
        console.error('[CalendarRepo] Supabase unsubscribe failed:', error);
        return false;
    }

    return true;
}

/**
 * Get all calendars a user is subscribed to
 */
export async function findSubscriptions(userId: string): Promise<Calendar[]> {
    if (!userId) return [];

    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('calendar_subscriptions')
            .select('calendar_id, calendars(*)')
            .eq('user_id', userId);

        if (error || !data) return [];

        return data
            .filter(row => row.calendars)
            .map(row => toCalendar(row.calendars as Record<string, unknown>));
    } catch (error) {
        console.error('[CalendarRepo] findSubscriptions failed:', error);
        return [];
    }
}

/**
 * Check if user is subscribed to a calendar
 */
export async function isSubscribed(calendarId: string, userId: string): Promise<boolean> {
    if (!calendarId || !userId) return false;

    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('calendar_subscriptions')
            .select('id')
            .eq('calendar_id', calendarId)
            .eq('user_id', userId)
            .single();

        return !error && !!data;
    } catch {
        return false;
    }
}
