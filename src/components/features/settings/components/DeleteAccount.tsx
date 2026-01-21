/**
 * Delete Account Component - Real Supabase Auth integration
 * Account deletion with confirmation modal
 */

'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function DeleteAccount() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [showConfirm, setShowConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (confirmText !== 'DELETE') return;

        setIsDeleting(true);
        setError(null);

        try {
            const supabase = createSupabaseBrowserClient();

            // Note: Supabase client-side SDK cannot delete users directly
            // You need to call an Edge Function or API route that uses the admin client
            // For now, we'll call an API route

            const response = await fetch('/api/account/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: user?.uid }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete account');
            }

            // Sign out and redirect
            await signOut();
            router.push('/');
        } catch (err: any) {
            console.error('Failed to delete account:', err);
            setError(err.message || 'Failed to delete account. Please try again or contact support.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-white">Delete Account</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                    If you no longer wish to use Pulse, you can permanently delete your account.
                </p>
            </div>

            {!showConfirm ? (
                <button
                    onClick={() => setShowConfirm(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--error-soft)] border border-[var(--error)]/30 rounded-lg text-[var(--error)] text-sm font-medium hover:bg-[var(--error)]/20 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    Delete My Account
                </button>
            ) : (
                <div className="bg-[var(--bg-tertiary)] border border-[var(--error)]/30 rounded-lg p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-[var(--error)] shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-base font-semibold text-white">
                                Are you absolutely sure?
                            </h4>
                            <p className="text-sm text-[var(--text-muted)] mt-1">
                                This action cannot be undone. This will permanently delete your account,
                                all your events, calendars, and remove all your data from our servers.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-[var(--error-soft)] border border-[var(--error)]/20 rounded-lg">
                            <p className="text-sm text-[var(--error)]">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-2">
                            Type <span className="font-mono text-white">DELETE</span> to confirm
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="w-full max-w-xs bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--error)]/50 outline-none transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDelete}
                            disabled={confirmText !== 'DELETE' || isDeleting}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--error)] rounded-lg text-white text-sm font-medium hover:bg-[var(--error)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Delete Account
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setShowConfirm(false);
                                setConfirmText('');
                                setError(null);
                            }}
                            className="px-5 py-2.5 text-[var(--text-muted)] text-sm font-medium hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
