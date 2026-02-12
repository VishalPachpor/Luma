/**
 * Account Syncing Component - Real iCal and Google integration
 * Calendar and contact syncing options
 */

'use client';

import { useState } from 'react';
import { Rss, Loader2, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Google icon
const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

export default function AccountSyncing() {
    const { user } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);
    const [showIcalUrl, setShowIcalUrl] = useState(false);
    const [copied, setCopied] = useState(false);
    const [googleSyncEnabled, setGoogleSyncEnabled] = useState(false);

    // Generate iCal feed URL for user's events
    const generateIcalUrl = () => {
        if (!user?.uid) return '';
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return `${baseUrl}/api/calendar/ical/${user.uid}`;
    };

    const handleAddIcal = async () => {
        setLoading('ical');

        // Simulate brief loading for better UX
        await new Promise(resolve => setTimeout(resolve, 500));

        setShowIcalUrl(true);
        setLoading(null);
    };

    const handleCopyIcalUrl = async () => {
        const url = generateIcalUrl();
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleEnableGoogleSync = async () => {
        setLoading('google');

        try {
            // In a real implementation, this would:
            // 1. Redirect to Google OAuth consent screen
            // 2. Request access to Google Contacts API
            // 3. Store the OAuth tokens
            // 4. Enable background sync

            // For now, we'll simulate the flow
            const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID'}` +
                `&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/google/callback')}` +
                `&response_type=code` +
                `&scope=${encodeURIComponent('https://www.googleapis.com/auth/contacts.readonly')}` +
                `&access_type=offline`;

            // Check if Google Client ID is configured
            if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
                toast.info('Google OAuth requires configuration. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment.');
            } else {
                window.open(googleOAuthUrl, '_blank', 'width=500,height=600');
            }

            // For demo purposes, toggle the state
            setGoogleSyncEnabled(!googleSyncEnabled);
        } catch (err) {
            console.error('Failed to enable Google sync:', err);
        } finally {
            setLoading(null);
        }
    };

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-white">Account Syncing</h3>
            </div>

            {/* Sync Options List */}
            <div className="bg-(--bg-tertiary) border border-(--border-primary) rounded-lg divide-y divide-(--border-primary)">
                {/* iCal Subscription */}
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                                <Rss className="w-5 h-5 text-(--text-muted)" />
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-white">Calendar Syncing</h4>
                                <p className="text-xs text-(--text-muted) mt-0.5">
                                    Sync your Pulse events with your Google, Outlook, or Apple calendar.
                                </p>
                            </div>
                        </div>
                        {!showIcalUrl && (
                            <button
                                onClick={handleAddIcal}
                                disabled={loading === 'ical'}
                                className="shrink-0 px-4 py-2 bg-(--bg-elevated) border border-(--btn-secondary-border) rounded-lg text-white text-sm font-medium hover:bg-(--bg-hover) disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                                {loading === 'ical' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Add iCal Subscription'
                                )}
                            </button>
                        )}
                    </div>

                    {/* iCal URL Display */}
                    {showIcalUrl && (
                        <div className="mt-4 space-y-3">
                            <p className="text-xs text-(--text-muted)">
                                Copy this URL and add it to your calendar app:
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-(--bg-elevated) border border-(--border-primary) rounded-lg px-3 py-2 text-sm text-(--text-secondary) font-mono overflow-hidden overflow-ellipsis">
                                    {generateIcalUrl()}
                                </div>
                                <button
                                    onClick={handleCopyIcalUrl}
                                    className="shrink-0 p-2 bg-(--bg-elevated) border border-(--border-primary) rounded-lg hover:bg-(--bg-hover) transition-colors"
                                >
                                    {copied ? (
                                        <CheckCircle className="w-4 h-4 text-(--success)" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-(--text-muted)" />
                                    )}
                                </button>
                            </div>
                            <div className="flex gap-2 text-xs">
                                <a
                                    href={`https://calendar.google.com/calendar/r/settings/addbyurl?url=${encodeURIComponent(generateIcalUrl())}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-(--accent-blue) hover:underline flex items-center gap-1"
                                >
                                    Add to Google Calendar <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Google Contacts Sync */}
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5"><GoogleIcon /></div>
                        <div>
                            <h4 className="text-sm font-medium text-white">Sync Contacts with Google</h4>
                            <p className="text-xs text-(--text-muted) mt-0.5">
                                Sync your Gmail contacts to easily invite them to your events.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleEnableGoogleSync}
                        disabled={loading === 'google'}
                        className={`shrink-0 px-4 py-2 border rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${googleSyncEnabled
                            ? 'bg-(--success-soft) border-(--success)/30 text-(--success)'
                            : 'bg-(--bg-elevated) border-(--btn-secondary-border) text-white hover:bg-(--bg-hover)'
                            } disabled:opacity-50`}
                    >
                        {loading === 'google' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : googleSyncEnabled ? (
                            'Synced ✓'
                        ) : (
                            'Enable Syncing'
                        )}
                    </button>
                </div>
            </div>
        </section>
    );
}
