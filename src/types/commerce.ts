/**
 * Commerce Types
 * Definitions for Tickets, Orders, and Guests (Luma Architecture)
 */

export type TicketType = 'free' | 'stripe' | 'crypto';

export interface TicketTier {
    id: string;
    eventId: string;
    name: string; // e.g. "General Admission", "VIP"
    description?: string;
    price: number;
    currency: string; // e.g. "USD", "ETH", "SOL"
    type: TicketType;
    inventory: number;
    maxPerOrder?: number;
    salesStart?: string; // ISO Date
    salesEnd?: string;   // ISO Date
}

export type OrderStatus = 'pending_payment' | 'confirmed' | 'failed' | 'refunded';

export interface Order {
    id: string;
    userId: string;
    eventId: string;
    status: OrderStatus;
    totalAmount: number;
    currency: string;
    createdAt: string;
    updatedAt: string;

    // Payment Details
    paymentProvider?: 'stripe' | 'crypto';
    paymentIntentId?: string; // Stripe PaymentIntent ID
    txHash?: string;          // Crypto Transaction Hash
    walletAddress?: string;   // Crypto Sender Address
}

export type GuestStatus = 'pending' | 'pending_approval' | 'approved' | 'issued' | 'scanned' | 'revoked' | 'rejected';

export interface Guest {
    id: string; // Unique Ticket ID
    orderId: string;
    eventId: string;
    ticketTierId: string;
    userId: string; // The attendee

    // Security
    qrToken: string; // Secure random token for the QR code
    status: GuestStatus;
    checkedInAt?: string;

    // Metadata
    createdAt: string;
}
