/**
 * Account Syncing Component
 * Calendar and contacts sync options
 */

'use client';

import { GlossyCard, Button } from '@/components/components/ui';
import { Calendar, Users } from 'lucide-react';

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
    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-xl font-bold text-text-primary">Account Syncing</h3>
            </div>

            <GlossyCard className="divide-y divide-white/5 overflow-hidden">
                {/* Calendar Syncing */}
                <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                        <Calendar className="w-5 h-5 text-text-muted" />
                        <div>
                            <h4 className="font-medium text-text-primary">Calendar Syncing</h4>
                            <p className="text-sm text-text-secondary">
                                Sync your Pulse events with your Google, Outlook, or Apple calendar.
                            </p>
                        </div>
                    </div>
                    <Button variant="secondary" size="sm" className="shrink-0">
                        Add iCal Subscription
                    </Button>
                </div>

                {/* Sync Contacts */}
                <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                        <GoogleIcon />
                        <div>
                            <h4 className="font-medium text-text-primary">Sync Contacts with Google</h4>
                            <p className="text-sm text-text-secondary">
                                Sync your Gmail contacts to easily invite them to your events.
                            </p>
                        </div>
                    </div>
                    <Button variant="secondary" size="sm" className="shrink-0">
                        Enable Syncing
                    </Button>
                </div>
            </GlossyCard>
        </section>
    );
}
