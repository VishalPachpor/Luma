'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
    Settings,
    Eye,
    EyeOff,
    Shield,
    Users,
    Lock,
    Globe,
    Trash2,
    AlertTriangle,
    Save,
    Loader2,
    CheckCircle2,
    ChevronRight,
    Ban,
} from 'lucide-react';

interface EventSettings {
    title: string;
    visibility: 'public' | 'private';
    status: string;
    require_approval: boolean;
    capacity: number | null;
    require_stake: boolean;
    stake_amount: number | null;
    stake_currency: string;
}

export default function EventSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;
    const { user } = useAuth();
    const supabase = createSupabaseBrowserClient();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<EventSettings | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [stakeAmountInput, setStakeAmountInput] = useState('');

    const fetchSettings = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error: fetchError } = await supabase
                .from('events')
                .select('title, visibility, status, require_approval, capacity, require_stake, stake_amount, stake_currency')
                .eq('id', eventId)
                .single();

            if (fetchError) throw fetchError;
            setSettings(data as EventSettings);
            if (data.stake_amount !== null && data.stake_amount !== undefined) {
                setStakeAmountInput(data.stake_amount.toString());
            }
        } catch {
            setError('Failed to load event settings');
        } finally {
            setLoading(false);
        }
    }, [eventId, user, supabase]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleSave = async (updates: Partial<EventSettings>) => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const { error: updateError } = await supabase
                .from('events')
                .update(updates)
                .eq('id', eventId);

            if (updateError) throw updateError;

            setSettings(prev => prev ? { ...prev, ...updates } : prev);
            setSuccess('Settings saved');
            setTimeout(() => setSuccess(null), 3000);
        } catch {
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirmText !== settings?.title) return;
        setDeleting(true);
        try {
            const { error: deleteError } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId);

            if (deleteError) throw deleteError;
            router.push('/');
        } catch {
            setError('Failed to delete event');
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-surface-1 border border-white/5 rounded-2xl p-6 animate-pulse">
                        <div className="h-5 w-40 bg-white/10 rounded mb-4" />
                        <div className="h-12 w-full bg-white/5 rounded-xl" />
                    </div>
                ))}
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="text-center py-20">
                <p className="text-white/40">Event not found</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Event Settings</h1>
                    <p className="text-white/40 mt-1">Manage your event configuration</p>
                </div>
            </div>

            {/* Status Messages */}
            {success && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm animate-in fade-in">
                    <CheckCircle2 size={16} />
                    {success}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            {/* Visibility Section */}
            <SettingsSection
                icon={Globe}
                title="Visibility"
                description="Control who can see and find your event"
            >
                <div className="space-y-3">
                    <SettingsToggleCard
                        icon={Eye}
                        title="Public event"
                        description="Visible in search and discovery"
                        active={settings.visibility === 'public'}
                        onClick={() => handleSave({ visibility: 'public' })}
                    />
                    <SettingsToggleCard
                        icon={EyeOff}
                        title="Private event"
                        description="Only accessible via direct link"
                        active={settings.visibility === 'private'}
                        onClick={() => handleSave({ visibility: 'private' })}
                    />
                </div>
            </SettingsSection>

            {/* Registration Section */}
            <SettingsSection
                icon={Shield}
                title="Registration"
                description="Control how guests register for your event"
            >
                <div className="space-y-4">
                    <ToggleRow
                        label="Require approval"
                        description="Manually approve each registration before confirmation"
                        enabled={settings.require_approval}
                        onChange={(v) => handleSave({ require_approval: v })}
                        saving={saving}
                    />

                    <div className="border-t border-white/5 pt-4">
                        <label className="text-sm font-medium text-white/60 mb-2 block">Maximum capacity</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                value={settings.capacity || ''}
                                onChange={(e) => {
                                    const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                    setSettings(prev => prev ? { ...prev, capacity: val } : prev);
                                }}
                                placeholder="Unlimited"
                                min={1}
                                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
                            />
                            <button
                                onClick={() => handleSave({ capacity: settings.capacity })}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white text-sm font-medium rounded-xl hover:bg-white/15 disabled:opacity-50 transition-colors"
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Save
                            </button>
                        </div>
                        <p className="text-xs text-white/30 mt-2">Leave empty for unlimited capacity</p>
                    </div>
                </div>
            </SettingsSection>

            {/* Staking Section */}
            <SettingsSection
                icon={Lock}
                title="Staking"
                description="Require a crypto stake for registration"
            >
                <div className="space-y-4">
                    <ToggleRow
                        label="Require stake"
                        description="Attendees must stake crypto to register"
                        enabled={settings.require_stake}
                        onChange={(v) => handleSave({ require_stake: v })}
                        saving={saving}
                    />

                    {settings.require_stake && (
                        <div className="border-t border-white/5 pt-4 space-y-4">
                            {/* Amount Input */}
                            <div>
                                <label className="text-sm font-medium text-white/60 mb-2 block">
                                    Stake Amount ({settings.stake_currency || 'USDC'})
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={stakeAmountInput}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setStakeAmountInput(val);
                                            const num = parseFloat(val);
                                            setSettings(prev => prev ? { ...prev, stake_amount: isNaN(num) ? null : num } : prev);
                                        }}
                                        placeholder="0.00"
                                        min={0}
                                        step="any" // Allow any decimal
                                        className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
                                    />
                                    <button
                                        onClick={() => handleSave({ stake_amount: settings.stake_amount })}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white text-sm font-medium rounded-xl hover:bg-white/15 disabled:opacity-50 transition-colors"
                                    >
                                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        Save
                                    </button>
                                </div>
                            </div>

                            {/* Currency Selector */}
                            <div>
                                <label className="text-sm font-medium text-white/60 mb-2 block">Currency</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['USDC', 'USDT', 'ETH', 'SOL'].map((currency) => (
                                        <button
                                            key={currency}
                                            onClick={() => handleSave({ stake_currency: currency })}
                                            disabled={saving}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${settings.stake_currency === currency
                                                ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                                }`}
                                        >
                                            {currency}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </SettingsSection>

            {/* Event Status */}
            <SettingsSection
                icon={Settings}
                title="Event Status"
                description="Manage the lifecycle state of your event"
            >
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                            <StatusDot status={settings.status} />
                            <div>
                                <p className="text-sm text-white font-medium capitalize">{settings.status}</p>
                                <p className="text-xs text-white/30">Current event status</p>
                            </div>
                        </div>
                        {settings.status === 'draft' && (
                            <button
                                onClick={() => handleSave({ status: 'published' } as Partial<EventSettings>)}
                                disabled={saving}
                                className="px-4 py-2 bg-indigo-500 text-white text-xs font-medium rounded-lg hover:bg-indigo-400 disabled:opacity-50 transition-colors"
                            >
                                Publish
                            </button>
                        )}
                        {settings.status === 'published' && (
                            <button
                                onClick={() => handleSave({ status: 'draft' } as Partial<EventSettings>)}
                                disabled={saving}
                                className="px-4 py-2 bg-white/10 text-white text-xs font-medium rounded-lg hover:bg-white/15 disabled:opacity-50 transition-colors"
                            >
                                Unpublish
                            </button>
                        )}
                    </div>
                </div>
            </SettingsSection>

            {/* Danger Zone */}
            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <AlertTriangle size={18} className="text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">Danger Zone</h3>
                            <p className="text-sm text-white/40">Irreversible actions</p>
                        </div>
                    </div>

                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 text-sm font-medium rounded-xl hover:bg-red-500/20 border border-red-500/10 transition-colors"
                        >
                            <Trash2 size={14} />
                            Delete this event
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-white/60">
                                Type <span className="font-mono text-red-400">{settings.title}</span> to confirm deletion:
                            </p>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type event title to confirm"
                                className="w-full px-4 py-2.5 bg-red-500/5 border border-red-500/20 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-red-500/30 transition-colors"
                            />
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteConfirmText !== settings.title || deleting}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
                                >
                                    {deleting ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={14} />
                                    )}
                                    Delete permanently
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeleteConfirmText('');
                                    }}
                                    className="text-sm text-white/40 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Sub-components ─── */

function SettingsSection({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-surface-1 border border-white/5 rounded-2xl overflow-hidden">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-white/5 rounded-lg">
                        <Icon size={18} className="text-white/60" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">{title}</h3>
                        <p className="text-sm text-white/40">{description}</p>
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
}

function SettingsToggleCard({
    icon: Icon,
    title,
    description,
    active,
    onClick,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    description: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${active
                ? 'bg-indigo-500/10 border-indigo-500/30'
                : 'bg-white/2 border-white/5 hover:border-white/10'
                }`}
        >
            <div className={`p-2 rounded-lg ${active ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
                <Icon size={16} className={active ? 'text-indigo-400' : 'text-white/40'} />
            </div>
            <div className="flex-1">
                <p className={`text-sm font-medium ${active ? 'text-white' : 'text-white/60'}`}>{title}</p>
                <p className="text-xs text-white/30">{description}</p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 transition-colors ${active ? 'border-indigo-400 bg-indigo-400' : 'border-white/20'
                }`}>
                {active && (
                    <svg viewBox="0 0 16 16" fill="none" className="w-full h-full p-0.5">
                        <path d="M4 8l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>
        </button>
    );
}

function ToggleRow({
    label,
    description,
    enabled,
    onChange,
    saving,
}: {
    label: string;
    description: string;
    enabled: boolean;
    onChange: (value: boolean) => void;
    saving: boolean;
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-white font-medium">{label}</p>
                <p className="text-xs text-white/30">{description}</p>
            </div>
            <button
                onClick={() => onChange(!enabled)}
                disabled={saving}
                className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-indigo-500' : 'bg-white/10'
                    }`}
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
            </button>
        </div>
    );
}

function StatusDot({ status }: { status: string }) {
    const colors: Record<string, string> = {
        draft: 'bg-yellow-400',
        published: 'bg-green-400',
        live: 'bg-blue-400 animate-pulse',
        ended: 'bg-white/30',
        archived: 'bg-white/10',
    };

    return (
        <span className={`w-2.5 h-2.5 rounded-full ${colors[status] || 'bg-white/20'}`} />
    );
}
