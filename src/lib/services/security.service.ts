/**
 * Security Service
 * Supabase Auth security operations
 */

import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
}

/**
 * Change password for current user
 */
export async function changePassword(
    currentPassword: string, // Unused in Supabase implicitly if already logged in, but nice for verification
    newPassword: string
): Promise<void> {
    const supabase = createSupabaseBrowserClient();

    // Supabase allows updating password if session is active
    const { error } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (error) throw error;
}

/**
 * Check if 2FA enabled
 */
export function has2FAEnabled(): boolean {
    // Supabase MFA check requires checking factors
    // This is async in Supabase usually, but we might just return false for now as migration step
    return false; // TODO: Implement Supabase MFA status check
}

/**
 * Start 2FA enrollment (Placeholder)
 */
export async function start2FAEnrollment(phoneNumber: string): Promise<string> {
    throw new Error('MFA Enrollment requires Supabase Pro / backend implementation');
}

/**
 * Complete 2FA enrollment (Placeholder)
 */
export async function complete2FAEnrollment(verificationId: string, otp: string): Promise<void> {
    throw new Error('Not implemented');
}
