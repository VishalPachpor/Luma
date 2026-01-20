/**
 * Calendar Settings Tab
 * Calendar configuration and admin management
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Settings, Users, Globe, Lock, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, Switch } from '@/components/components/ui';
import type { Calendar, CalendarColor } from '@/types/calendar';

export default function CalendarSettingsPage() {
    const params = useParams();
    const calendarId = params.id as string;

    const [calendar, setCalendar] = useState<Calendar | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetchCalendar() {
            setLoading(true);

            const { data, error } = await supabase
                .from('calendars')
                .select('*')
                .eq('id', calendarId)
                .single();

            if (!error && data) {
                setCalendar({
                    id: data.id,
                    ownerId: data.owner_id,
                    name: data.name,
                    slug: data.slug,
                    description: data.description ?? undefined,
                    color: (data.color ?? 'indigo') as CalendarColor,
                    avatarUrl: data.avatar_url ?? undefined,
                    coverUrl: data.cover_url ?? undefined,
                    location: data.location ?? undefined,
                    latitude: data.latitude ?? undefined,
                    longitude: data.longitude ?? undefined,
                    isGlobal: data.is_global,
                    subscriberCount: data.subscriber_count,
                    eventCount: data.event_count,
                    isPrivate: data.is_private,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                });
            }
            setLoading(false);
        }

        fetchCalendar();
    }, [calendarId]);

    async function handleSave() {
        if (!calendar) return;

        setSaving(true);
        // Save logic here
        setSaving(false);
    }

    if (loading) {
        return <SettingsSkeleton />;
    }

    return (
        <div className="max-w-2xl">
            {/* Display Section */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Display
                </h2>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                            Calendar Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={calendar?.name ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendar(prev => prev ? { ...prev, name: e.target.value } : null)}
                            placeholder="My Calendar"
                            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    <div>
                        <label htmlFor="slug" className="block text-sm font-medium text-foreground mb-1.5">
                            Calendar URL
                        </label>
                        <div className="flex items-center">
                            <span className="text-sm text-muted-foreground mr-1">planx.io/</span>
                            <input
                                id="slug"
                                type="text"
                                value={calendar?.slug ?? ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendar(prev => prev ? { ...prev, slug: e.target.value } : null)}
                                placeholder="my-calendar"
                                className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1.5">
                            Description
                        </label>
                        <input
                            id="description"
                            type="text"
                            value={calendar?.description ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendar(prev => prev ? { ...prev, description: e.target.value } : null)}
                            placeholder="A brief description of your calendar"
                            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>
            </section>

            <hr className="border-border my-8" />

            {/* Options Section */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Options
                </h2>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Public Calendar</p>
                                <p className="text-sm text-muted-foreground">
                                    Anyone can discover and subscribe to this calendar
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={!calendar?.isPrivate}
                            onCheckedChange={(checked: boolean) => setCalendar(prev => prev ? { ...prev, isPrivate: !checked } : null)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Lock className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Require Approval</p>
                                <p className="text-sm text-muted-foreground">
                                    New subscribers need your approval
                                </p>
                            </div>
                        </div>
                        <Switch checked={false} onCheckedChange={() => { }} />
                    </div>
                </div>
            </section>

            <hr className="border-border my-8" />

            {/* Team Calendar Section */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Calendar
                </h2>

                <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="font-semibold mb-2">Convert to Team Calendar</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Team calendars allow multiple admins to manage events and settings.
                        This action cannot be undone.
                    </p>
                    <Button variant="secondary">Convert to Team</Button>
                </div>
            </section>

            <hr className="border-border my-8" />

            {/* Danger Zone */}
            <section>
                <h2 className="text-xl font-semibold mb-4 text-red-500 flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Danger Zone
                </h2>

                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                    <h3 className="font-semibold mb-2">Delete Calendar</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Permanently delete this calendar and all its events. This action cannot be undone.
                    </p>
                    <Button variant="primary" className="bg-red-500 hover:bg-red-600">Delete Calendar</Button>
                </div>
            </section>

            {/* Save Button */}
            <div className="sticky bottom-4 mt-8">
                <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
}

function SettingsSkeleton() {
    return (
        <div className="max-w-2xl space-y-8">
            {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                    <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                    <div className="space-y-3">
                        <div className="h-10 bg-muted rounded animate-pulse" />
                        <div className="h-10 bg-muted rounded animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    );
}
