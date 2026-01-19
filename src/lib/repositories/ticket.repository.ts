/**
 * Ticket Repository
 * CRUD operations for ticket_tiers table
 */

import { supabase } from '@/lib/supabase';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { TicketTier, TicketType } from '@/types/commerce';

interface TicketTierRow {
    id: string;
    event_id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    ticket_type: string;
    inventory: number;
    sold_count: number;
    max_per_order: number;
    sales_start: string | null;
    sales_end: string | null;
    created_at: string;
}


function normalizeTicketTier(row: TicketTierRow): TicketTier {
    return {
        id: row.id,
        eventId: row.event_id,
        name: row.name,
        description: row.description || undefined,
        price: row.price,
        currency: row.currency,
        type: row.ticket_type as TicketType,
        inventory: row.inventory,
        maxPerOrder: row.max_per_order,
        salesStart: row.sales_start || undefined,
        salesEnd: row.sales_end || undefined,
    };
}

/**
 * Get all ticket tiers for an event
 */
export async function getTicketTiers(eventId: string): Promise<TicketTier[]> {
    const { data, error } = await supabase
        .from('ticket_tiers' as any)
        .select('*')
        .eq('event_id', eventId)
        .order('price', { ascending: true });

    if (error) {
        console.error('[TicketRepo] getTicketTiers error:', error);
        return [];
    }

    return (data || []).map((row: any) => normalizeTicketTier(row));
}

/**
 * Get a single ticket tier by ID
 */
export async function getTicketTierById(tierId: string): Promise<TicketTier | null> {
    const { data, error } = await supabase
        .from('ticket_tiers' as any)
        .select('*')
        .eq('id', tierId)
        .single();

    if (error || !data) return null;
    return normalizeTicketTier(data as any);
}

/**
 * Create a new ticket tier
 */
export async function createTicketTier(
    eventId: string,
    tier: {
        name: string;
        description?: string;
        price: number;
        currency?: string;
        type: TicketType;
        inventory: number;
        maxPerOrder?: number;
        salesStart?: string;
        salesEnd?: string;
    }
): Promise<TicketTier> {
    const supabaseBrowser = createSupabaseBrowserClient();

    const { data, error } = await supabaseBrowser
        .from('ticket_tiers' as any)
        .insert({
            event_id: eventId,
            name: tier.name,
            description: tier.description || null,
            price: tier.price,
            currency: tier.currency || 'ETH',
            ticket_type: tier.type,
            inventory: tier.inventory,
            max_per_order: tier.maxPerOrder || 10,
            sales_start: tier.salesStart || null,
            sales_end: tier.salesEnd || null,
        })
        .select()
        .single();

    if (error) {
        console.error('[TicketRepo] createTicketTier error:', error);
        throw new Error(error.message);
    }

    return normalizeTicketTier(data as any);
}

/**
 * Update a ticket tier
 */
export async function updateTicketTier(
    tierId: string,
    updates: Partial<{
        name: string;
        description: string;
        price: number;
        inventory: number;
        maxPerOrder: number;
        salesStart: string;
        salesEnd: string;
    }>
): Promise<TicketTier | null> {
    const supabaseBrowser = createSupabaseBrowserClient();

    const updateRow: Record<string, any> = {};
    if (updates.name !== undefined) updateRow.name = updates.name;
    if (updates.description !== undefined) updateRow.description = updates.description;
    if (updates.price !== undefined) updateRow.price = updates.price;
    if (updates.inventory !== undefined) updateRow.inventory = updates.inventory;
    if (updates.maxPerOrder !== undefined) updateRow.max_per_order = updates.maxPerOrder;
    if (updates.salesStart !== undefined) updateRow.sales_start = updates.salesStart;
    if (updates.salesEnd !== undefined) updateRow.sales_end = updates.salesEnd;

    const { data, error } = await supabaseBrowser
        .from('ticket_tiers' as any)
        .update(updateRow)
        .eq('id', tierId)
        .select()
        .single();

    if (error) {
        console.error('[TicketRepo] updateTicketTier error:', error);
        return null;
    }

    return normalizeTicketTier(data as any);
}

/**
 * Delete a ticket tier
 */
export async function deleteTicketTier(tierId: string): Promise<boolean> {
    const supabaseBrowser = createSupabaseBrowserClient();

    const { error } = await supabaseBrowser
        .from('ticket_tiers' as any)
        .delete()
        .eq('id', tierId);

    if (error) {
        console.error('[TicketRepo] deleteTicketTier error:', error);
        return false;
    }

    return true;
}

/**
 * Get remaining inventory for a tier
 */
export async function getRemainingInventory(tierId: string): Promise<number> {
    const { data, error } = await supabase
        .from('ticket_tiers' as any)
        .select('inventory, sold_count')
        .eq('id', tierId)
        .single();

    if (error || !data) return 0;
    const typedData = data as any;
    return Math.max(0, typedData.inventory - (typedData.sold_count || 0));
}

/**
 * Increment sold count (called after successful purchase)
 */
export async function incrementSoldCount(tierId: string, quantity: number = 1): Promise<void> {
    const supabaseBrowser = createSupabaseBrowserClient();

    // Use RPC or manual increment
    const { data: tier } = await supabaseBrowser
        .from('ticket_tiers' as any)
        .select('sold_count')
        .eq('id', tierId)
        .single();

    if (!tier) return;

    const typedTier = tier as any;
    await supabaseBrowser
        .from('ticket_tiers' as any)
        .update({ sold_count: (typedTier.sold_count || 0) + quantity })
        .eq('id', tierId);
}
