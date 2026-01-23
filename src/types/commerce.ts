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

    // Line items (Multi-ticket in future, currently single tier)
    ticketTierId?: string;
    quantity?: number;

    // Payment Details
    paymentProvider?: 'stripe' | 'crypto';
    paymentIntentId?: string; // Stripe PaymentIntent ID
    txHash?: string;          // Crypto Transaction Hash
    walletAddress?: string;   // Crypto Sender Address
}

/**
 * Guest/Ticket Status Lifecycle
 * 
 * Valid transitions:
 *   pending → pending_approval (when approval required)
 *   pending → issued (free registration, no approval)
 *   pending_approval → approved (organizer approves)
 *   pending_approval → rejected (organizer rejects)
 *   approved → staked (payment received)
 *   approved → issued (free event after approval)
 *   issued → checked_in (attendance verified)
 *   issued → revoked (organizer revokes)
 *   staked → checked_in (attendance verified, stake released to organizer)
 *   staked → refunded (guest cancels within grace period)
 *   staked → forfeited (no-show, stake kept)
 */
export type GuestStatus =
    | 'pending'           // Initial state
    | 'pending_approval'  // Waiting for organizer approval
    | 'approved'          // Approval granted, pending payment/claim
    | 'rejected'          // Approval rejected (terminal)
    | 'issued'            // Free ticket issued, can check in
    | 'staked'            // Paid/staked, awaiting check-in
    | 'checked_in'        // Attendance verified (terminal success)
    | 'scanned'           // Legacy: same as checked_in
    | 'refunded'          // Stake returned (terminal)
    | 'forfeited'         // No-show, stake kept (terminal)
    | 'revoked';          // Ticket revoked by organizer (terminal)

/**
 * Guest/Ticket Lifecycle Metadata
 * Tracks staking and transition history
 */
export interface GuestLifecycle {
    stakeAmount?: number;
    stakeCurrency?: string;
    stakeTxHash?: string;
    stakeWalletAddress?: string;
    forfeitedAt?: string;
    refundedAt?: string;
    refundTxHash?: string;
    previousStatus?: GuestStatus;
    statusChangedAt?: string;
}

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

    // Lifecycle metadata
    lifecycle?: GuestLifecycle;

    // Metadata
    createdAt: string;
}

/**
 * Terminal states - no further transitions allowed
 */
export const TERMINAL_GUEST_STATUSES: GuestStatus[] = [
    'rejected',
    'checked_in',
    'scanned',
    'refunded',
    'forfeited',
    'revoked',
];

/**
 * Check if a guest status is terminal (no further transitions)
 */
export function isTerminalStatus(status: GuestStatus): boolean {
    return TERMINAL_GUEST_STATUSES.includes(status);
}
