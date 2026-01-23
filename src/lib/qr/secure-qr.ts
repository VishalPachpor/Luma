/**
 * Secure QR Code Generation & Verification
 * 
 * Features:
 * - Signed payloads (HMAC-SHA256)
 * - Timestamp validation (5-minute expiry)
 * - Nonce for replay protection
 * - Cryptographic binding to event
 */

import { createHmac, randomBytes } from 'crypto';
import { getServiceSupabase } from '@/lib/supabase';

// ============================================================================
// Configuration
// ============================================================================

const QR_SECRET = process.env.QR_SIGNING_SECRET || 'dev-secret-change-in-production';
const QR_EXPIRY_SECONDS = 300; // 5 minutes
const NONCE_LENGTH = 8;

// ============================================================================
// Types
// ============================================================================

export interface QRPayload {
    guestId: string;
    eventId: string;
    timestamp: number;
    nonce: string;
}

export interface QRVerifyResult {
    valid: boolean;
    guestId?: string;
    eventId?: string;
    error?: string;
}

// ============================================================================
// Generate Secure QR
// ============================================================================

/**
 * Generate a cryptographically signed QR code payload
 */
export function generateSecureQR(guestId: string, eventId: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(NONCE_LENGTH / 2).toString('hex');

    const payload = `${guestId}:${eventId}:${timestamp}:${nonce}`;
    const signature = sign(payload);

    return `${payload}:${signature}`;
}

/**
 * Generate a refreshable QR (for dynamic display)
 */
export function generateRefreshableQR(guestId: string, eventId: string): {
    qrData: string;
    expiresAt: number;
    refreshAfter: number;
} {
    const qrData = generateSecureQR(guestId, eventId);
    const expiresAt = Date.now() + (QR_EXPIRY_SECONDS * 1000);
    const refreshAfter = Date.now() + ((QR_EXPIRY_SECONDS / 2) * 1000); // Refresh at half expiry

    return { qrData, expiresAt, refreshAfter };
}

// ============================================================================
// Verify Secure QR
// ============================================================================

/**
 * Verify a QR code and check all security properties
 */
export async function verifySecureQR(qrData: string): Promise<QRVerifyResult> {
    // 1. Parse payload
    const parts = qrData.split(':');
    if (parts.length !== 5) {
        return { valid: false, error: 'Invalid QR format' };
    }

    const [guestId, eventId, timestampStr, nonce, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // 2. Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > QR_EXPIRY_SECONDS) {
        return { valid: false, error: 'QR code expired' };
    }

    // 3. Check for future timestamps (clock skew)
    if (timestamp > now + 60) {
        return { valid: false, error: 'Invalid timestamp' };
    }

    // 4. Verify signature
    const payload = `${guestId}:${eventId}:${timestampStr}:${nonce}`;
    const expectedSignature = sign(payload);

    if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid signature' };
    }

    // 5. Check replay (nonce already used)
    const isReplayed = await checkNonceUsed(nonce);
    if (isReplayed) {
        return { valid: false, error: 'QR code already used' };
    }

    return { valid: true, guestId, eventId };
}

/**
 * Verify and consume a QR code (marks nonce as used)
 */
export async function verifyAndConsumeQR(qrData: string): Promise<QRVerifyResult> {
    const result = await verifySecureQR(qrData);

    if (result.valid) {
        // Extract nonce and mark as used
        const parts = qrData.split(':');
        const nonce = parts[3];
        await markNonceUsed(nonce, result.guestId!, result.eventId!);
    }

    return result;
}

// ============================================================================
// Internal Functions
// ============================================================================

function sign(payload: string): string {
    return createHmac('sha256', QR_SECRET)
        .update(payload)
        .digest('hex')
        .slice(0, 16); // Truncate for shorter QR
}

async function checkNonceUsed(nonce: string): Promise<boolean> {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
        .from('qr_nonces')
        .select('id')
        .eq('nonce', nonce)
        .maybeSingle();

    // Table might not exist yet, treat as not used
    if (error && error.code === '42P01') {
        return false;
    }

    return !!data;
}

async function markNonceUsed(nonce: string, guestId: string, eventId: string): Promise<void> {
    const supabase = getServiceSupabase();

    await supabase.from('qr_nonces').insert({
        nonce,
        guest_id: guestId,
        event_id: eventId,
        used_at: new Date().toISOString(),
    });
}

// ============================================================================
// Offline Verification (for disconnected scanners)
// ============================================================================

/**
 * Verify QR without database check (for offline mode)
 * Only checks signature and expiry, not replay protection
 */
export function verifyQROffline(qrData: string): QRVerifyResult {
    const parts = qrData.split(':');
    if (parts.length !== 5) {
        return { valid: false, error: 'Invalid QR format' };
    }

    const [guestId, eventId, timestampStr, nonce, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // Check expiry (with 1 minute grace for clock skew)
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > QR_EXPIRY_SECONDS + 60) {
        return { valid: false, error: 'QR code expired' };
    }

    // Verify signature
    const payload = `${guestId}:${eventId}:${timestampStr}:${nonce}`;
    const expectedSignature = sign(payload);

    if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true, guestId, eventId };
}
