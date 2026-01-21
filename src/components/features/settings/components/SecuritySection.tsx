/**
 * Security Section - Luma-exact styling with REAL Supabase Auth integration
 * Password, two-factor authentication, and passkey settings
 */

'use client';

import { useState } from 'react';
import { Lock, Shield, Key, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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

    /**
     * Enable 2FA - Supabase MFA enrollment
     * Note: Requires Supabase MFA to be enabled in project settings
     */
    const handleEnable2FA = async () => {
        setLoadingItem('2fa');
        try {
            const supabase = createSupabaseBrowserClient();

            // Enroll in TOTP MFA
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: 'Authenticator App',
            });

            if (error) throw error;

            // In a real implementation, you'd show a QR code modal here
            // data.totp.qr_code contains the QR code data URL
            // data.totp.secret contains the TOTP secret

            if (data?.totp?.qr_code) {
                // For now, open QR code in new window (you'd want a proper modal)
                const newWindow = window.open('', '_blank', 'width=400,height=400');
                if (newWindow) {
                    newWindow.document.write(`
                        <html>
                            <head><title>Scan QR Code</title></head>
                            <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#1a1a1f;color:white;font-family:system-ui;">
                                <h2>Scan with Authenticator App</h2>
                                <img src="${data.totp.qr_code}" alt="2FA QR Code" style="margin:20px 0;" />
                                <p style="font-size:12px;color:#888;">Secret: ${data.totp.secret}</p>
                            </body>
                        </html>
                    `);
                }
                showFeedback('success', '2FA enrollment started. Scan the QR code with your authenticator app.');
            }
        } catch (err: any) {
            console.error('Failed to enable 2FA:', err);
            showFeedback('error', err.message || 'Failed to enable 2FA. Make sure MFA is enabled in your Supabase project.');
        } finally {
            setLoadingItem(null);
        }
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
            icon: <Lock className="w-5 h-5 text-[var(--text-muted)]" />,
            title: 'Account Password',
            description: 'Set a password to secure your account.',
            buttonText: 'Set Password',
            onClick: () => setShowPasswordModal(true),
            isLoading: loadingItem === 'password',
        },
        {
            id: '2fa',
            icon: <Shield className="w-5 h-5 text-[var(--text-muted)]" />,
            title: 'Two-Factor Authentication',
            description: 'Add an extra layer of security with an authenticator app.',
            buttonText: 'Enable 2FA',
            onClick: handleEnable2FA,
            isLoading: loadingItem === '2fa',
        },
        {
            id: 'passkey',
            icon: <Key className="w-5 h-5 text-[var(--text-muted)]" />,
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
                <p className="text-sm text-[var(--text-muted)] mt-1">
                    Secure your account with password and two-factor authentication.
                </p>
            </div>

            {/* Feedback Banner */}
            {feedback.type && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${feedback.type === 'success'
                        ? 'bg-[var(--success-soft)] border border-[var(--success)]/20'
                        : 'bg-[var(--error-soft)] border border-[var(--error)]/20'
                    }`}>
                    {feedback.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-[var(--error)]" />
                    )}
                    <p className={`text-sm ${feedback.type === 'success' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                        {feedback.message}
                    </p>
                </div>
            )}

            {/* Security Items List */}
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg divide-y divide-[var(--border-primary)]">
                {securityItems.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center justify-between p-4"
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">{item.icon}</div>
                            <div>
                                <h4 className="text-sm font-medium text-white">{item.title}</h4>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={item.onClick}
                            disabled={item.isLoading}
                            className="shrink-0 px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--btn-secondary-border)] rounded-lg text-white text-sm font-medium hover:bg-[var(--bg-hover)] disabled:opacity-50 transition-colors"
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
                    <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl p-6 w-full max-w-md mx-4 space-y-4">
                        <h3 className="text-lg font-semibold text-white">Set Password</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--border-hover)] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--border-hover)] outline-none"
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
                                className="px-4 py-2.5 text-[var(--text-muted)] text-sm font-medium hover:text-white transition-colors"
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
