/**
 * Security Section - Luma-exact styling with REAL Supabase Auth integration
 * Password, two-factor authentication, and passkey settings
 */

'use client';

import { useState } from 'react';
import { Lock, Shield, Key, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackState {
    type: 'success' | 'error' | null;
    message: string;
}

export default function SecuritySection() {
    const { user } = useAuth();
    const [loadingItem, setLoadingItem] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<FeedbackState>({ type: null, message: '' });

    // Password modal state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback({ type: null, message: '' }), 5000);
    };

    /**
     * Set/Update Password using Supabase Auth
     */
    const handleSetPassword = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            showFeedback('error', 'Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            showFeedback('error', 'Password must be at least 8 characters');
            return;
        }

        setLoadingItem('password');
        try {
            const supabase = createSupabaseBrowserClient();
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            showFeedback('success', 'Password updated successfully!');
            setShowPasswordModal(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error('Failed to set password:', err);
            showFeedback('error', err.message || 'Failed to update password');
        } finally {
            setLoadingItem(null);
        }
    };

    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [verifyCode, setVerifyCode] = useState('');
    const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);

    /**
     * Enable 2FA - Supabase MFA enrollment
     * Step 1: Enroll (get QR code)
     */
    const handleEnable2FA = async () => {
        setLoadingItem('2fa');
        try {
            const supabase = createSupabaseBrowserClient();
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: 'Luma Clone App',
            });

            if (error) throw error;

            setEnrollFactorId(data.id);
            setQrCodeUrl(data.totp.qr_code);
            // Don't close loading yet, we switch to verification UI
        } catch (err: any) {
            console.error('Failed to enable 2FA:', err);
            showFeedback('error', err.message);
            setLoadingItem(null);
        }
    };

    /**
     * Step 2: Verify OTP to finalize enrollment
     */
    const handleVerifyOTP = async () => {
        if (!enrollFactorId || !verifyCode) return;
        setLoadingItem('verify-otp');

        try {
            const supabase = createSupabaseBrowserClient();
            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId: enrollFactorId,
                code: verifyCode,
            });

            if (error) throw error;

            showFeedback('success', 'Two-factor authentication enabled successfully!');
            setQrCodeUrl(null);
            setVerifyCode('');
            setEnrollFactorId(null);
        } catch (err: any) {
            console.error('Failed to verify OTP:', err);
            showFeedback('error', err.message || 'Invalid code. Please try again.');
        } finally {
            setLoadingItem(null);
        }
    };

    /**
     * Disable 2FA
     */
    const handleDisable2FA = async () => {
        // Implementation would require listing factors and un-enrolling
        // For now, this is a placeholder or could link to account management
        alert('To disable 2FA, please contact support or use the Supabase dashboard (dev mode).');
    };

    /**
     * Add Passkey using WebAuthn
     * Note: Requires browser support and HTTPS
     */
    const handleAddPasskey = async () => {
        setLoadingItem('passkey');
        try {
            // Check if WebAuthn is supported
            if (!window.PublicKeyCredential) {
                throw new Error('Passkeys are not supported in this browser');
            }

            // Check if platform authenticator is available
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (!available) {
                throw new Error('No platform authenticator available. Try using a hardware security key.');
            }

            // In production, you'd call your backend to start the registration
            // This is a simplified example showing the concept
            showFeedback('success', 'Passkey feature requires backend WebAuthn implementation. Coming soon!');

        } catch (err: any) {
            console.error('Failed to add passkey:', err);
            showFeedback('error', err.message || 'Failed to add passkey');
        } finally {
            setLoadingItem(null);
        }
    };

    const securityItems = [
        {
            id: 'password',
            icon: <Lock className="w-5 h-5 text-(--text-muted)" />,
            title: 'Account Password',
            description: 'Set a password to secure your account.',
            buttonText: 'Set Password',
            onClick: () => setShowPasswordModal(true),
            isLoading: loadingItem === 'password',
        },
        {
            id: '2fa',
            icon: <Shield className="w-5 h-5 text-(--text-muted)" />,
            title: 'Two-Factor Authentication',
            description: 'Add an extra layer of security with an authenticator app.',
            buttonText: 'Enable 2FA',
            onClick: handleEnable2FA,
            isLoading: loadingItem === '2fa',
        },
        {
            id: 'passkey',
            icon: <Key className="w-5 h-5 text-(--text-muted)" />,
            title: 'Passkeys',
            description: 'Passkeys are a secure and convenient way to sign in.',
            buttonText: 'Add Passkey',
            onClick: handleAddPasskey,
            isLoading: loadingItem === 'passkey',
        },
    ];

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-white">Password & Security</h3>
                <p className="text-sm text-(--text-muted) mt-1">
                    Secure your account with password and two-factor authentication.
                </p>
            </div>

            {/* Feedback Banner */}
            {feedback.type && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${feedback.type === 'success'
                    ? 'bg-(--success-soft) border border-(--success)/20'
                    : 'bg-(--error-soft) border border-(--error)/20'
                    }`}>
                    {feedback.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-(--success)" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-(--error)" />
                    )}
                    <p className={`text-sm ${feedback.type === 'success' ? 'text-(--success)' : 'text-(--error)'}`}>
                        {feedback.message}
                    </p>
                </div>
            )}

            {/* QR Code & Verification UI */}
            {qrCodeUrl && (
                <div className="bg-(--bg-tertiary) border border-(--border-primary) rounded-xl p-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="bg-white p-4 rounded-xl border border-white/10 mx-auto md:mx-0">
                            <QRCodeSVG value={qrCodeUrl} size={160} />
                        </div>
                        <div className="flex-1 space-y-4 w-full">
                            <div>
                                <h4 className="text-lg font-medium text-white">Scan QR Code</h4>
                                <p className="text-sm text-(--text-muted) mt-1">
                                    Use your authenticator app (like Google Authenticator or Authy) to scan this code.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-(--text-muted) tracking-wider">
                                    Verification Code
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="flex-1 bg-(--bg-elevated) border border-(--border-primary) rounded-lg px-4 py-2.5 text-white font-mono text-lg tracking-widest placeholder:text-white/10 outline-none focus:border-(--accent-blue) transition-colors text-center"
                                        maxLength={6}
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleVerifyOTP}
                                        disabled={loadingItem === 'verify-otp' || verifyCode.length !== 6}
                                        className="px-6 py-2.5 bg-white text-black font-medium rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[100px]"
                                    >
                                        {loadingItem === 'verify-otp' ? (
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                        ) : (
                                            'Verify'
                                        )}
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        setQrCodeUrl(null);
                                        setVerifyCode('');
                                        setEnrollFactorId(null);
                                    }}
                                    className="text-xs text-(--text-muted) hover:text-white transition-colors"
                                >
                                    Cancel setup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Security Items List */}
            <div className="bg-(--bg-tertiary) border border-(--border-primary) rounded-lg divide-y divide-(--border-primary)">
                {securityItems.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center justify-between p-4"
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">{item.icon}</div>
                            <div>
                                <h4 className="text-sm font-medium text-white">{item.title}</h4>
                                <p className="text-xs text-(--text-muted) mt-0.5">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={item.onClick}
                            disabled={item.isLoading}
                            className="shrink-0 px-4 py-2 bg-(--bg-elevated) border border-(--btn-secondary-border) rounded-lg text-white text-sm font-medium hover:bg-(--bg-hover) disabled:opacity-50 transition-colors"
                        >
                            {item.isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                item.buttonText
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-(--bg-tertiary) border border-(--border-primary) rounded-xl p-6 w-full max-w-md mx-4 space-y-4">
                        <h3 className="text-lg font-semibold text-white">Set Password</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-(--text-secondary) mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full bg-(--bg-elevated) border border-(--border-primary) rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-(--text-muted) focus:border-(--border-hover) outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-(--text-secondary) mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full bg-(--bg-elevated) border border-(--border-primary) rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-(--text-muted) focus:border-(--border-hover) outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleSetPassword}
                                disabled={loadingItem === 'password'}
                                className="flex-1 px-4 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-50 transition-colors"
                            >
                                {loadingItem === 'password' ? (
                                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                ) : (
                                    'Update Password'
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setNewPassword('');
                                    setConfirmPassword('');
                                }}
                                className="px-4 py-2.5 text-(--text-muted) text-sm font-medium hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
