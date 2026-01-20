import { SupabaseClient } from '@supabase/supabase-js';

export interface CryptoConfig {
    wallet_address: string;
    accepted_tokens: string[];
    network: string;
}

export interface SellerInfo {
    seller_name: string;
    seller_address: string;
    memo: string;
}

export interface Coupon {
    id: string;
    code: string;
    type: 'percent' | 'fixed';
    value: number;
    max_uses: number | null;
    used_count: number;
    starts_at: string | null;
    expires_at: string | null;
    active: boolean;
}

export interface CalendarPaymentConfig {
    wallet_address: string | null;
    accepted_tokens: string[];
    network: string;
    seller_name: string | null;
    seller_address: string | null;
    memo: string | null;
    refund_policy_type: string;
    refund_policy_text: string | null;
}

export const calendarPaymentRepository = {
    // --- Config ---

    async getConfig(supabase: SupabaseClient, calendarId: string): Promise<CalendarPaymentConfig | null> {
        const { data, error } = await supabase
            .from('calendar_payment_config')
            .select('*')
            .eq('calendar_id', calendarId)
            .single();

        if (error && error.code !== 'PGRST116') { // Ignore not found error
            console.error('Error fetching payment config:', error);
            throw error;
        }

        return data; // Returns null if not found
    },

    async updateConfig(supabase: SupabaseClient, calendarId: string, updates: Partial<CalendarPaymentConfig>) {
        // Upsert logic: ID is needed for upsert, but we only know calendarId.
        // We can use the UNIQUE constraint on calendar_id for ON CONFLICT.

        const { data, error } = await supabase
            .from('calendar_payment_config')
            .upsert({
                calendar_id: calendarId,
                ...updates,
                updated_at: new Date().toISOString()
            }, { onConflict: 'calendar_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Coupons ---

    async getCoupons(supabase: SupabaseClient, calendarId: string): Promise<Coupon[]> {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('calendar_id', calendarId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async createCoupon(supabase: SupabaseClient, calendarId: string, coupon: Omit<Coupon, 'id' | 'used_count'>) {
        const { data, error } = await supabase
            .from('coupons')
            .insert({
                calendar_id: calendarId,
                ...coupon
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCoupon(supabase: SupabaseClient, id: string) {
        const { error } = await supabase
            .from('coupons')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Transactions (Orders) ---

    // Note: This relies on orders table having event_id, and events having calendar_id
    // This requires a JOIN or two-step fetch if Supabase doesn't support deep nested filtering easily.
    // Assuming we can select orders where event.calendar_id = X
    async getTransactions(supabase: SupabaseClient, calendarId: string) {
        // Step 1: Get event IDs for this calendar
        const { data: events } = await supabase
            .from('events')
            .select('id')
            .eq('calendar_id', calendarId);

        if (!events || events.length === 0) return [];

        const eventIds = events.map(e => e.id);

        // Step 2: Get orders for these events
        // Note: Replace 'orders' with valid table name if different (e.g. 'payments' or 'rsvps' with payment info)
        // Based on 015_calendar_coupons.sql there IS an 'orders' table.
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                user:user_id (email, display_name),
                event:event_id (title)
            `)
            .in('event_id', eventIds)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }

        return orders;
    }
};
