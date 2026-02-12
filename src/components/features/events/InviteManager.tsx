'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Search, Plus, Mail, Check, X, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

interface Invite {
    id: string;
    email: string;
    code: string;
    status: 'pending' | 'accepted' | 'expired';
    created_at: string;
}

interface InviteManagerProps {
    eventId: string;
}

export default function InviteManager({ eventId }: InviteManagerProps) {
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [emailInput, setEmailInput] = useState('');
    const [sending, setSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        fetchInvites();
    }, [eventId]);

    const fetchInvites = async () => {
        try {
            const { data, error } = await supabase
                .from('invites')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvites(data || []);
        } catch (error) {
            console.error('Error fetching invites:', error);
            toast.error('Failed to load invites');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailInput.trim()) return;

        setSending(true);
        try {
            // Get current user (inviter)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Generate unique code
            const code = nanoid(10);

            // Create invite record
            const { data, error } = await supabase
                .from('invites')
                .insert({
                    event_id: eventId,
                    inviter_id: user.id,
                    email: emailInput.trim(),
                    code,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            // In a real app, you would verify this API call succeeds before optimizing UI
            // For now we assume the database insert is the source of truth

            // TODO: Call API to send email (via Resend)
            // await fetch('/api/invites/send', { ... })

            toast.success(`Invite created for ${emailInput}`);
            setInvites([data, ...invites]);
            setEmailInput('');
        } catch (error: any) {
            console.error('Error creating invite:', error);
            toast.error(error.message || 'Failed to send invite');
        } finally {
            setSending(false);
        }
    };

    const copyInviteLink = (code: string) => {
        const link = `${window.location.origin}/invite/${code}`;
        navigator.clipboard.writeText(link);
        toast.success('Invite link copied to clipboard');
    };

    const filteredInvites = invites.filter(invite =>
        invite.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Guest Invites</h3>
                    <p className="text-sm text-text-muted">Manage invitations and track status.</p>
                </div>
                <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                    <span className="text-2xl font-bold text-white">{invites.length}</span>
                    <span className="text-sm text-text-muted ml-2">sent</span>
                </div>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInvite} className="flex gap-3">
                <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full bg-bg-elevated border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-text-muted focus:border-accent-blue outline-none transition-colors"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={sending}
                    className="px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                    {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Plus className="w-4 h-4" />
                    )}
                    Send Invite
                </button>
            </form>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search invites..."
                    className="w-full bg-bg-secondary border border-white/5 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-text-muted focus:border-white/10 outline-none"
                />
            </div>

            {/* Invites List */}
            <div className="bg-bg-elevated border border-white/10 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-3 border-b border-white/10 bg-white/5 text-xs font-medium text-text-muted uppercase tracking-wider">
                    <div className="col-span-5">Email</div>
                    <div className="col-span-3">Status</div>
                    <div className="col-span-3">Sent</div>
                    <div className="col-span-1">Action</div>
                </div>

                {loading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
                    </div>
                ) : filteredInvites.length === 0 ? (
                    <div className="p-8 text-center text-text-muted text-sm">
                        {searchTerm ? 'No invites found matching your search' : 'No invites sent yet'}
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredInvites.map((invite) => (
                            <div key={invite.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-white/2 transition-colors">
                                <div className="col-span-5 text-sm text-white font-medium truncate">
                                    {invite.email}
                                </div>
                                <div className="col-span-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${invite.status === 'accepted'
                                            ? 'bg-green-500/10 text-green-400'
                                            : invite.status === 'expired'
                                                ? 'bg-red-500/10 text-red-400'
                                                : 'bg-yellow-500/10 text-yellow-400'
                                        }`}>
                                        {invite.status === 'accepted' && <Check className="w-3 h-3" />}
                                        {invite.status === 'expired' && <X className="w-3 h-3" />}
                                        <span className="capitalize">{invite.status}</span>
                                    </span>
                                </div>
                                <div className="col-span-3 text-sm text-text-muted">
                                    {new Date(invite.created_at).toLocaleDateString()}
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <button
                                        onClick={() => copyInviteLink(invite.code)}
                                        className="p-1.5 text-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                        title="Copy Invite Link"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
