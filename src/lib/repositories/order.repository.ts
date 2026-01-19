import {
    collection,
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
    Timestamp,
    updateDoc
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { Order, OrderStatus } from '@/types/commerce';
import { generateId } from '@/lib/utils';
import { User } from '@/types/user';

const ORDERS_COLLECTION = 'orders';

/**
 * Order Repository
 * Handles payment intents and order tracking
 */

export async function createOrder(
    userId: string,
    eventId: string,
    amount: number,
    currency: string = 'USD'
): Promise<Order> {
    if (!db || !isFirebaseConfigured) {
        throw new Error('Firebase not configured');
    }

    const orderId = generateId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);

    const newOrder: Order = {
        id: orderId,
        userId,
        eventId,
        status: 'pending_payment',
        totalAmount: amount,
        currency,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    try {
        await setDoc(orderRef, {
            ...newOrder,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return newOrder;
    } catch (error) {
        console.error('[OrderRepo] Create failed:', error);
        throw error;
    }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, paymentDetails?: Partial<Order>): Promise<void> {
    if (!db || !isFirebaseConfigured) return;

    try {
        const orderRef = doc(db, ORDERS_COLLECTION, orderId);
        await updateDoc(orderRef, {
            status,
            ...paymentDetails,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('[OrderRepo] Update status failed:', error);
        throw error;
    }
}

export async function findOrder(orderId: string): Promise<Order | null> {
    if (!db || !isFirebaseConfigured) return null;

    try {
        const orderRef = doc(db, ORDERS_COLLECTION, orderId);
        const snap = await getDoc(orderRef);
        if (snap.exists()) {
            const data = snap.data();
            return {
                ...data,
                id: snap.id,
                createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.().toISOString() || data.updatedAt,
            } as Order;
        }
        return null;
    } catch (error) {
        console.error('[OrderRepo] Find failed:', error);
        return null;
    }
}
