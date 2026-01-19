/**
 * Security Service
 * Firebase Auth security operations: password reset, 2FA, etc.
 */

import {
    sendPasswordResetEmail,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    multiFactor,
    PhoneAuthProvider,
    PhoneMultiFactorGenerator,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

/**
 * Send password reset email to current user
 */
export async function sendPasswordReset(email: string): Promise<void> {
    if (!auth || !isFirebaseConfigured) {
        throw new Error('Firebase not configured');
    }

    await sendPasswordResetEmail(auth, email);
}

/**
 * Change password for current user (requires reauthentication)
 */
export async function changePassword(
    currentPassword: string,
    newPassword: string
): Promise<void> {
    if (!auth || !isFirebaseConfigured || !auth.currentUser) {
        throw new Error('Not authenticated');
    }

    const user = auth.currentUser;
    const email = user.email;

    if (!email) {
        throw new Error('No email associated with account');
    }

    // Reauthenticate user
    const credential = EmailAuthProvider.credential(email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);
}

/**
 * Check if user has 2FA enabled
 */
export function has2FAEnabled(): boolean {
    if (!auth?.currentUser) return false;
    const mfaUser = multiFactor(auth.currentUser);
    return mfaUser.enrolledFactors.length > 0;
}

/**
 * Start 2FA enrollment process
 * Returns verificationId for OTP verification
 */
export async function start2FAEnrollment(
    phoneNumber: string,
    recaptchaVerifier: unknown
): Promise<string> {
    if (!auth?.currentUser) {
        throw new Error('Not authenticated');
    }

    const mfaUser = multiFactor(auth.currentUser);
    const session = await mfaUser.getSession();

    const phoneAuthProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        { phoneNumber, session },
        recaptchaVerifier as import('firebase/auth').RecaptchaVerifier
    );

    return verificationId;
}

/**
 * Complete 2FA enrollment with OTP
 */
export async function complete2FAEnrollment(
    verificationId: string,
    otp: string
): Promise<void> {
    if (!auth?.currentUser) {
        throw new Error('Not authenticated');
    }

    const credential = PhoneAuthProvider.credential(verificationId, otp);
    const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(credential);
    const mfaUser = multiFactor(auth.currentUser);

    await mfaUser.enroll(multiFactorAssertion, 'Phone Number');
}
