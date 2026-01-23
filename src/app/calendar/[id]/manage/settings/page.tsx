'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function DisplaySettingsPage() {
    const params = useParams();
    const calendarId = params.id as string;
    const { user } = useAuth();
    const supabase = createSupabaseBrowserClient();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
    });

    // Fetch calendar details
    useEffect(() => {
        async function fetchCalendar() {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from('calendars')
                    .select('name, slug, description')
                    .eq('id', calendarId)
                    .single();

                if (error) throw error;
                if (data) {
                    setFormData({
                        name: data.name || '',
                        slug: data.slug || '',
                        description: data.description || '',
                    });
                }
            } catch (err) {
                console.error('Error fetching calendar:', err);
                setMessage({ type: 'error', text: 'Failed to load settings' });
            } finally {
                setLoading(false);
            }
        }

        fetchCalendar();
    }, [calendarId, user, supabase]);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('calendars')
                .update({
                    name: formData.name,
                    slug: formData.slug,
                    description: formData.description,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', calendarId);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Calendar updated successfully' });
        } catch (err) {
            console.error('Error saving calendar:', err);
            setMessage({ type: 'error', text: 'Failed to save changes' });
        } finally {
            setSaving(false);
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
                <h2 className="text-xl font-semibold text-white mb-1">Display</h2>
                <p className="text-sm text-white/50">
                    Manage your calendar&apos;s public profile and branding.
                </p>
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-6">
                {/* Calendar Name */}
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">Calendar Name</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-[#1C1C1E] border-white/10 text-white focus:border-white/20 placeholder:text-white/20"
                        placeholder="e.g. Personal Calendar"
                    />
                </div>

                {/* Calendar URL */}
                <div className="space-y-2">
                    <Label htmlFor="slug" className="text-white">Calendar URL</Label>
                    <div className="flex items-center">
                        <span className="bg-[#1C1C1E] border border-r-0 border-white/10 text-white/40 px-3 py-2 rounded-l-md text-sm">
                            luma.com/
                        </span>
                        <Input
                            id="slug"
                            value={formData.slug}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                            className="rounded-l-none bg-[#1C1C1E] border-white/10 text-white focus:border-white/20 placeholder:text-white/20"
                            placeholder="my-calendar"
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="description" className="text-white">Description</Label>
                    <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="bg-[#1C1C1E] border-white/10 text-white focus:border-white/20 placeholder:text-white/20 min-h-[100px]"
                        placeholder="A brief description of your calendar events..."
                    />
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-white/5 flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-white text-black hover:bg-white/90"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
