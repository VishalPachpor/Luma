'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OptionsSettingsPage() {
    const params = useParams();
    const calendarId = params.id as string;
    const { user } = useAuth();
    const supabase = createSupabaseBrowserClient();

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [settings, setSettings] = useState({
        eventVisibility: 'public',
        publicGuestList: true,
        collectFeedback: false,
    });

    // Fetch settings
    useEffect(() => {
        async function fetchSettings() {
            if (!user) return;

            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data, error } = await (supabase as any)
                    .from('calendars')
                    .select('event_visibility, public_guest_list, collect_feedback')
                    .eq('id', calendarId)
                    .single();

                if (error) throw error;
                if (data) {
                    setSettings({
                        eventVisibility: data.event_visibility || 'public',
                        publicGuestList: data.public_guest_list ?? true,
                        collectFeedback: data.collect_feedback ?? false,
                    });
                }
            } catch (err) {
                console.error('Error fetching options:', err);
                setMessage({ type: 'error', text: 'Failed to load options' });
            } finally {
                setLoading(false);
            }
        }

        fetchSettings();
    }, [calendarId, user, supabase]);

    const updateSetting = async (key: string, value: string | boolean) => {
        // Optimistic update
        setSettings(prev => ({ ...prev, [key]: value }));
        setMessage(null);

        try {
            const dbKey = key === 'eventVisibility' ? 'event_visibility' : key === 'publicGuestList' ? 'public_guest_list' : 'collect_feedback';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('calendars')
                .update({ [dbKey]: value })
                .eq('id', calendarId);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Setting updated' });
            setTimeout(() => setMessage(null), 2000);
        } catch (err) {
            console.error('Error updating setting:', err);
            setMessage({ type: 'error', text: 'Failed to update setting' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-white/20" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold text-white mb-1">Options</h2>
                <p className="text-sm text-white/50">
                    Default settings for new events created on this calendar.
                </p>
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-6">
                {/* Event Defaults Section */}
                <div className="bg-bg-elevated border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                    <div className="px-4 py-3 bg-white/5 border-b border-white/5">
                        <h3 className="text-sm font-medium text-white">Event Defaults</h3>
                    </div>

                    {/* Event Visibility */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base text-white">Event Visibility</Label>
                            <p className="text-sm text-white/40">
                                Whether events are shown on the calendar page.
                            </p>
                        </div>
                        <Select
                            value={settings.eventVisibility}
                            onValueChange={(val: string) => updateSetting('eventVisibility', val)}
                        >
                            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                            <SelectContent className="bg-bg-elevated border-white/10 text-white">
                                <SelectItem value="public">Public</SelectItem>
                                <SelectItem value="private">Private</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Public Guest List */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base text-white">Public Guest List</Label>
                            <p className="text-sm text-white/40">
                                Whether to show guest list on event pages.
                            </p>
                        </div>
                        <Switch
                            checked={settings.publicGuestList}
                            onCheckedChange={(val: boolean) => updateSetting('publicGuestList', val)}
                            className="data-[state=checked]:bg-white"
                        />
                    </div>

                    {/* Collect Feedback */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base text-white">Collect Feedback</Label>
                            <p className="text-sm text-white/40">
                                Email guests after the event to collect feedback.
                            </p>
                        </div>
                        <Switch
                            checked={settings.collectFeedback}
                            onCheckedChange={(val: boolean) => updateSetting('collectFeedback', val)}
                            className="data-[state=checked]:bg-white"
                        />
                    </div>
                </div>

                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-sm text-white/60">
                        Changing these defaults does not affect existing events. You can always change these settings for each individual event.
                    </p>
                </div>
            </div>
        </div>
    );
}
