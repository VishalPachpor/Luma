import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types/commerce';
import { generateId } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

/**
 * Order Repository
 * Handles payment intents and order tracking in Supabase
 */

function normalizeOrder(data: any): Order {
    return {
        id: data.id,
        userId: data.user_id,
        eventId: data.event_id,
        status: data.status as OrderStatus,
        totalAmount: data.total_amount,
        currency: data.currency,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        ticketTierId: data.ticket_tier_id,
        quantity: data.quantity,
        paymentProvider: data.payment_provider,
        paymentIntentId: data.payment_intent_id
    };
}

export async function createOrder(
    userId: string,
    eventId: string,
    amount: number,
    currency: string = 'USD'
): Promise<Order> {
    const orderId = generateId();
    const supabaseBrowser = createSupabaseBrowserClient();

    const { data, error } = await supabaseBrowser
        .from('orders' as any)
        .insert({
            id: orderId,
            user_id: userId,
            event_id: eventId,
            total_amount: amount,
            currency,
            status: 'pending_payment',
        })
        .select()
        .single();

    if (error) {
        console.error('[OrderRepo] Create failed:', error);
        throw new Error(error.message);
    }

    return normalizeOrder(data);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, paymentDetails?: Partial<Order>): Promise<void> {
    const supabaseBrowser = createSupabaseBrowserClient();

    const updates: any = { status };
    if (paymentDetails?.paymentIntentId) updates.payment_intent_id = paymentDetails.paymentIntentId;
    if (paymentDetails?.paymentProvider) updates.payment_provider = paymentDetails.paymentProvider;
    if (paymentDetails?.txHash) updates.tx_hash = paymentDetails.txHash;

    const { error } = await supabaseBrowser
        .from('orders' as any)
        .update(updates)
        .eq('id', orderId);

    if (error) {
        console.error('[OrderRepo] Update status failed:', error);
        throw error;
    }
}

export async function findOrder(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
        .from('orders' as any)
        .select('*')
        .eq('id', orderId)
        .single();

    if (error || !data) {
        console.error('[OrderRepo] Find failed:', error);
        return null;
    }

    return normalizeOrder(data);
}
