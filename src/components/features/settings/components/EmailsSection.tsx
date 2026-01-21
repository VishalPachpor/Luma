/**
 * Emails Section - Real Supabase integration
 * Manage email addresses with Primary badge
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Loader2, CheckCircle, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function EmailsSection() {
    const { user } = useAuth();
    const { settings } = useUserSettings();
    const [isAddingEmail, setIsAddingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Get additional emails from settings
    const additionalEmails = settings?.emails || [];

    const handleAddEmail = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const supabase = createSupabaseBrowserClient();

            // For Supabase, adding secondary emails requires email verification flow
            // We'll store them in user settings and optionally trigger verification

            // Update settings with new email
            const currentEmails = settings?.emails || [];
            if (currentEmails.includes(newEmail) || user?.email === newEmail) {
                setError('This email is already added');
                setIsLoading(false);
                return;
            }

            // Store in profile preferences
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    preferences: {
                        ...settings,
                        emails: [...currentEmails, newEmail],
                    },
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user?.uid);

            if (updateError) throw updateError;

            setSuccess('Email added successfully!');
            setNewEmail('');
            setIsAddingEmail(false);

            // Refresh settings
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Failed to add email:', err);
            setError(err.message || 'Failed to add email');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveEmail = async (emailToRemove: string) => {
        setIsLoading(true);
        try {
            const supabase = createSupabaseBrowserClient();
            const currentEmails = settings?.emails || [];
            const updatedEmails = currentEmails.filter(e => e !== emailToRemove);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    preferences: {
                        ...settings,
                        emails: updatedEmails,
                    },
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user?.uid);

            if (updateError) throw updateError;
            setSuccess('Email removed');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Failed to remove email:', err);
            setError(err.message || 'Failed to remove email');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Emails</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Add additional emails to receive event invites sent to those addresses.
                    </p>
                </div>
                <button
                    onClick={() => setIsAddingEmail(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--btn-secondary-border)] rounded-lg text-white text-sm font-medium hover:bg-[var(--bg-elevated)] transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Email
                </button>
            </div>

            {/* Feedback */}
            {error && (
                <div className="p-3 bg-[var(--error-soft)] border border-[var(--error)]/20 rounded-lg text-sm text-[var(--error)]">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-3 bg-[var(--success-soft)] border border-[var(--success)]/20 rounded-lg text-sm text-[var(--success)] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {success}
                </div>
            )}

            {/* Primary Email Card */}
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-white text-sm">{user?.email}</span>
                            <span className="px-2 py-0.5 bg-[var(--success)]/20 text-[var(--success)] text-xs font-medium rounded-full">
                                Primary
                            </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            This email will be shared with hosts when you register for their events.
                        </p>
                    </div>
                </div>
            </div>

            {/* Additional Emails */}
            {additionalEmails.map((email) => (
                <div key={email} className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-white text-sm">{email}</span>
                        <button
                            onClick={() => handleRemoveEmail(email)}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--error)]"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}

            {/* Add Email Form */}
            {isAddingEmail && (
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg p-4 space-y-3">
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--border-hover)] outline-none transition-colors"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleAddEmail}
                            disabled={isLoading}
                            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 disabled:opacity-50 transition-colors"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Email'}
                        </button>
                        <button
                            onClick={() => {
                                setIsAddingEmail(false);
                                setNewEmail('');
                                setError(null);
                            }}
                            className="px-4 py-2 text-[var(--text-muted)] text-sm font-medium hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
