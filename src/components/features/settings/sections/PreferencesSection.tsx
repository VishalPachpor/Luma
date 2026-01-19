/**
 * Preferences Section
 * Production-grade settings UI with Firestore persistence
 */

'use client';

import { Switch, GlossyCard } from '@/components/components/ui';
import ThemeSelector from '../components/ThemeSelector';
import { ChevronRight, Globe, Loader2, AlertCircle } from 'lucide-react';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationSettings } from '@/types/settings';

interface NotificationRowProps {
    id: keyof NotificationSettings;
    label: string;
    hasWhatsapp?: boolean;
}

function NotificationRow({ id, label, hasWhatsapp = false }: NotificationRowProps) {
    const { settings, updateNotification } = useUserSettings();

    if (!settings) return null;

    const notification = settings.notifications[id];

    return (
        <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <span className="font-medium text-text-primary">{label}</span>
            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                    <span className={`text-xs ${notification.email ? 'text-text-primary' : 'text-text-muted'}`}>
                        Email
                    </span>
                    <Switch
                        checked={notification.email}
                        onCheckedChange={(checked) => updateNotification(id, 'email', checked)}
                    />
                </label>
                {hasWhatsapp && (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <span className={`text-xs ${notification.whatsapp ? 'text-text-primary' : 'text-text-muted'}`}>
                            WhatsApp
                        </span>
                        <Switch
                            checked={notification.whatsapp}
                            onCheckedChange={(checked) => updateNotification(id, 'whatsapp', checked)}
                        />
                    </label>
                )}
            </div>
        </div>
    );
}

export default function PreferencesSection() {
    const { user } = useAuth();
    const { settings, isLoading, error } = useUserSettings();

    // Not logged in state
    if (!user) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <GlossyCard className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                    <h3 className="text-lg font-bold text-text-primary mb-2">Sign In Required</h3>
                    <p className="text-text-secondary">
                        Please sign in to manage your preferences.
                    </p>
                </GlossyCard>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <GlossyCard className="p-12 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
                    <p className="text-text-secondary">Loading your preferences...</p>
                </GlossyCard>
            </div>
        );
    }

    // Error state
    if (error && !settings) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <GlossyCard className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <h3 className="text-lg font-bold text-text-primary mb-2">Error Loading Settings</h3>
                    <p className="text-text-secondary">{error}</p>
                </GlossyCard>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Error banner (non-blocking) */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {/* Display Settings */}
            <section className="space-y-4">
                <h3 className="text-xl font-bold text-text-primary">Display</h3>
                <GlossyCard className="p-6 space-y-6">
                    <div>
                        <label className="text-sm font-medium text-text-secondary block mb-4">
                            Choose your desired interface theme.
                        </label>
                        <ThemeSelector />
                    </div>

                    <div className="pt-6 border-t border-white/10">
                        <label className="text-sm font-medium text-text-secondary block mb-2">
                            Language
                        </label>
                        <button className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <Globe size={18} className="text-text-muted" />
                                <span className="text-text-primary">
                                    {settings?.language === 'en' ? 'English' : settings?.language}
                                </span>
                            </div>
                            <ChevronRight size={18} className="text-text-muted" />
                        </button>
                    </div>
                </GlossyCard>
            </section>

            {/* Notification Settings */}
            <section className="space-y-4">
                <h3 className="text-xl font-bold text-text-primary">Notifications</h3>
                <p className="text-sm text-text-secondary">
                    Choose how you would like to be notified about updates, invites and subscriptions.
                </p>

                {/* Events You Attend */}
                <GlossyCard className="divide-y divide-white/5 overflow-hidden">
                    <div className="p-4 bg-white/5">
                        <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                            Events You Attend
                        </h4>
                    </div>
                    <NotificationRow id="eventInvites" label="Event Invites" hasWhatsapp />
                    <NotificationRow id="eventReminders" label="Event Reminders" hasWhatsapp />
                    <NotificationRow id="eventBlasts" label="Event Blasts" hasWhatsapp />
                    <NotificationRow id="eventUpdates" label="Event Updates" />
                    <NotificationRow id="feedbackRequests" label="Feedback Requests" />
                </GlossyCard>

                {/* Events You Host */}
                <GlossyCard className="divide-y divide-white/5 overflow-hidden">
                    <div className="p-4 bg-white/5">
                        <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                            Events You Host
                        </h4>
                    </div>
                    <NotificationRow id="guestRegistrations" label="Guest Registrations" />
                    <NotificationRow id="feedbackResponses" label="Feedback Responses" />
                </GlossyCard>

                {/* Calendars You Manage */}
                <GlossyCard className="divide-y divide-white/5 overflow-hidden">
                    <div className="p-4 bg-white/5">
                        <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                            Calendars You Manage
                        </h4>
                    </div>
                    <NotificationRow id="newMembers" label="New Members" />
                    <NotificationRow id="eventSubmissions" label="Event Submissions" />
                </GlossyCard>

                {/* Platform */}
                <GlossyCard className="divide-y divide-white/5 overflow-hidden">
                    <div className="p-4 bg-white/5">
                        <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                            Pulse Updates
                        </h4>
                    </div>
                    <NotificationRow id="productUpdates" label="Product Updates" />
                </GlossyCard>
            </section>
        </div>
    );
}
