/**
 * Phone Section - Luma-exact styling
 * Phone number management with update functionality and warning banner
 */

'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useUserSettings } from '@/contexts/UserSettingsContext';

export default function PhoneSection() {
    const { settings, updatePhone } = useUserSettings();
    const [phone, setPhone] = useState(settings?.phone || '');
    const [isUpdating, setIsUpdating] = useState(false);
    const [showUnsubWarning] = useState(true); // Could be based on actual subscription status

    const handleUpdate = async () => {
        setIsUpdating(true);
        try {
            await updatePhone(phone);
        } catch (err) {
            console.error('Failed to update phone:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-white">Phone Number</h3>
                <p className="text-sm text-[var(--luma-text-muted)] mt-1">
                    Manage the phone number you use to sign in to Pulse and receive SMS updates.
                </p>
            </div>

            {/* Warning Banner - Luma yellow style */}
            {showUnsubWarning && (
                <div className="flex items-start gap-3 p-4 bg-[var(--luma-warning-bg)] border border-[var(--luma-warning-border)] rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-[var(--luma-warning-text)] shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="text-[var(--luma-warning-text)] font-medium">
                            You&apos;ve unsubscribed from Pulse messages.
                        </p>
                        <p className="text-[var(--luma-warning-text)]/80">
                            Send <span className="font-bold">START</span> via WhatsApp to +1 415 212 6297, then{' '}
                            <button className="underline hover:no-underline">click here</button> to resume receiving messages.
                        </p>
                    </div>
                </div>
            )}

            {/* Phone Input */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--luma-text-label)]">
                    Phone Number
                </label>
                <div className="flex items-center gap-3">
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 234 567 8900"
                        className="flex-1 max-w-xs bg-[var(--luma-bg-input)] border border-[var(--luma-border)] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[var(--luma-text-muted)] focus:border-[var(--luma-border-hover)] outline-none transition-colors"
                    />
                    <button
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className="px-4 py-2.5 bg-[var(--luma-bg-card)] border border-[var(--luma-btn-border)] rounded-lg text-white text-sm font-medium hover:bg-[var(--luma-bg-input)] disabled:opacity-50 transition-colors"
                    >
                        {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            'Update'
                        )}
                    </button>
                </div>
                <p className="text-xs text-[var(--luma-text-muted)]">
                    For your security, we will send you a code to verify any change to your phone number.
                </p>
            </div>
        </section>
    );
}
