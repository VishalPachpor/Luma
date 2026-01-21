'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Mail, Users, Search, Check, Loader2, Send, Eye, MousePointer, CheckCircle, XCircle, Clock } from 'lucide-react';
import Modal from '@/components/modals/Modal';
import { Button } from '@/components/components/ui';
import { useAuth } from '@/contexts/AuthContext';

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    eventTitle: string;
}

type InviteTab = 'suggestions' | 'manual' | 'sent';

interface InviteStats {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalAccepted: number;
    totalDeclined: number;
    totalBounced: number;
    openRate: number;
    clickRate: number;
    acceptRate: number;
}

interface SentInvite {
    id: string;
    email: string;
    recipientName?: string;
    status: 'pending' | 'sent' | 'opened' | 'clicked' | 'accepted' | 'declined' | 'bounced';
    sentAt?: string;
    openedAt?: string;
    createdAt: string;
}

// Status badge component
function StatusBadge({ status }: { status: SentInvite['status'] }) {
    const config = {
        pending: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Pending' },
        sent: { icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Sent' },
        opened: { icon: Eye, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Opened' },
        clicked: { icon: MousePointer, color: 'text-indigo-400', bg: 'bg-indigo-500/20', label: 'Clicked' },
        accepted: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Accepted' },
        declined: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Declined' },
        bounced: { icon: XCircle, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Bounced' },
    };

    const { icon: Icon, color, bg, label } = config[status] || config.pending;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color} ${bg}`}>
            <Icon className="w-3 h-3" />
            {label}
        </span>
    );
}

// Stats card component
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
    return (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
                <div className="text-lg font-bold text-white">{value}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider">{label}</div>
            </div>
        </div>
    );
}

export default function InviteModal({ isOpen, onClose, eventId, eventTitle }: InviteModalProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<InviteTab>('suggestions');
    const [manualEmails, setManualEmails] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);
    const [stats, setStats] = useState<InviteStats | null>(null);
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Fetch Stats and Sent Invites on Open
    useEffect(() => {
        if (isOpen) {
            fetchStats();
            if (activeTab === 'sent') {
                fetchSentInvites();
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && activeTab === 'suggestions') {
            fetchSuggestions();
        } else if (isOpen && activeTab === 'sent') {
            fetchSentInvites();
        }
    }, [isOpen, activeTab]);

    const fetchStats = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/events/${eventId}/invites/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching invite stats:', error);
        }
    };

    const fetchSentInvites = async () => {
        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/events/${eventId}/invites`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSentInvites(data.invitations || []);
            }
        } catch (error) {
            console.error('Error fetching sent invites:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuggestions = async () => {
        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/events/${eventId}/invites/suggestions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.suggestions) {
                setSuggestions(data.suggestions);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            fetchSuggestions();
            return;
        }

        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/invites/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.suggestions) {
                setSuggestions(data.suggestions);
            }
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        setSending(true);
        try {
            const emailsToSend = new Set(selectedEmails);

            if (manualEmails.trim()) {
                const manualList = manualEmails.split(/[\n,]+/).map(e => e.trim()).filter(e => e);
                manualList.forEach(e => emailsToSend.add(e));
            }

            if (emailsToSend.size === 0) return;

            const token = await user?.getIdToken();
            const res = await fetch(`/api/events/${eventId}/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ emails: Array.from(emailsToSend) })
            });

            if (res.ok) {
                const result = await res.json();
                const sentCount = result.results.filter((r: any) => r.status === 'sent').length;
                const failed = result.results.filter((r: any) => r.status === 'failed');

                if (failed.length > 0) {
                    setResult({
                        type: 'error',
                        message: `Sent ${sentCount} invites. ${failed.length} failed: ${failed.map((f: any) => f.email).join(', ')}`
                    });
                } else {
                    setResult({
                        type: 'success',
                        message: `Successfully sent ${sentCount} invite${sentCount !== 1 ? 's' : ''}!`
                    });
                }

                // Refresh stats and invites
                fetchStats();
                fetchSentInvites();

                setManualEmails('');
                setSelectedEmails(new Set());
                setActiveTab('sent'); // Switch to sent tab to show results

                // Auto-clear success message after 5s
                if (failed.length === 0) {
                    setTimeout(() => setResult(null), 5000);
                }
            } else {
                const errorData = await res.json();
                setResult({
                    type: 'error',
                    message: errorData.error || 'Failed to send invites'
                });
            }
        } catch (error) {
            console.error('Send error:', error);
            setResult({
                type: 'error',
                message: 'An unexpected error occurred. Please try again.'
            });
        } finally {
            setSending(false);
        }
    };

    const toggleSelection = (email: string) => {
        const next = new Set(selectedEmails);
        if (next.has(email)) next.delete(email);
        else next.add(email);
        setSelectedEmails(next);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <span>Invite Guests</span>
                    {remaining !== null && (
                        <div className="px-2 py-0.5 rounded-full bg-white/10 border border-white/5 text-[10px] font-medium text-white/60">
                            {remaining} LEFT
                        </div>
                    )}
                </div>
            }
            maxWidth="max-w-5xl"
        >
            <div className="flex flex-col h-[600px] w-full text-white">
                {/* Stats Header */}
                {stats && stats.totalSent > 0 && (
                    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                        <div className="flex items-center gap-4">
                            <StatCard label="Sent" value={stats.totalSent} icon={Send} color="bg-blue-500" />
                            <StatCard label="Opened" value={`${stats.openRate}%`} icon={Eye} color="bg-purple-500" />
                            <StatCard label="Clicked" value={`${stats.clickRate}%`} icon={MousePointer} color="bg-indigo-500" />
                            <StatCard label="Accepted" value={stats.totalAccepted} icon={CheckCircle} color="bg-green-500" />
                            <div className="flex-1" />
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white">{stats.acceptRate}%</div>
                                <div className="text-xs text-text-muted">Conversion Rate</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-1 overflow-hidden">
                    {/* SIDEBAR */}
                    <div className="w-64 border-r border-white/10 p-4 space-y-6">
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('suggestions')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'suggestions' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                Suggestions
                            </button>
                            <button
                                onClick={() => setActiveTab('manual')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'manual' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Mail className="w-4 h-4" />
                                Enter Emails
                            </button>
                            <button
                                onClick={() => setActiveTab('sent')}
                                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'sent' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <span className="flex items-center gap-3">
                                    <Send className="w-4 h-4" />
                                    Sent Invites
                                </span>
                                {stats && stats.totalSent > 0 && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10">
                                        {stats.totalSent}
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Calendar Contacts</h4>
                            <div className="text-sm text-text-muted px-3">Sync Calendar (Coming Soon)</div>
                        </div>
                    </div>

                    {/* MAIN CONTENT */}
                    <div className="flex-1 flex flex-col">
                        {activeTab === 'suggestions' ? (
                            <div className="flex-1 p-0 flex flex-col">
                                {/* Search Header */}
                                <div className="p-4 border-b border-white/10">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                        <input
                                            type="text"
                                            placeholder="Search suggestions..."
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                                        />
                                    </div>
                                </div>

                                {/* List */}
                                <div className="flex-1 overflow-y-auto p-2">
                                    {loading ? (
                                        <div className="flex items-center justify-center h-full text-text-muted">Loading...</div>
                                    ) : suggestions.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-60">
                                            <Users className="w-8 h-8 mb-2" />
                                            <p>No suggestions yet.</p>
                                        </div>
                                    ) : (
                                        suggestions.map((contact, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg cursor-pointer group"
                                                onClick={() => toggleSelection(contact.email)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300">
                                                        {(contact.name || contact.email).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-white">{contact.name || 'Unknown'}</div>
                                                        <div className="text-xs text-text-muted">{contact.email}</div>
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedEmails.has(contact.email) ? 'bg-blue-500 border-blue-500' : 'border-white/20 group-hover:border-white/40'
                                                    }`}>
                                                    {selectedEmails.has(contact.email) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : activeTab === 'manual' ? (
                            <div className="flex-1 p-6 flex flex-col">
                                <h3 className="text-lg font-bold text-white mb-2">Enter Emails Manually</h3>
                                <p className="text-sm text-text-muted mb-4">Paste a list of emails separated by commas or new lines.</p>
                                <textarea
                                    value={manualEmails}
                                    onChange={(e) => setManualEmails(e.target.value)}
                                    className="flex-1 w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-white/20 resize-none font-mono"
                                    placeholder="alice@example.com&#10;bob@example.com"
                                />
                            </div>
                        ) : (
                            /* SENT INVITES TAB */
                            <div className="flex-1 flex flex-col">
                                <div className="p-4 border-b border-white/10">
                                    <h3 className="text-lg font-bold text-white">Sent Invitations</h3>
                                    <p className="text-sm text-text-muted">Track the status of your invites</p>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {loading ? (
                                        <div className="flex items-center justify-center h-full text-text-muted">
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Loading...
                                        </div>
                                    ) : sentInvites.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-60">
                                            <Send className="w-8 h-8 mb-2" />
                                            <p>No invites sent yet.</p>
                                            <button
                                                onClick={() => setActiveTab('suggestions')}
                                                className="mt-3 text-sm text-indigo-400 hover:text-indigo-300"
                                            >
                                                Send your first invite →
                                            </button>
                                        </div>
                                    ) : (
                                        <table className="w-full">
                                            <thead className="bg-white/5 sticky top-0">
                                                <tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                                                    <th className="px-4 py-3 font-medium">Recipient</th>
                                                    <th className="px-4 py-3 font-medium">Status</th>
                                                    <th className="px-4 py-3 font-medium">Sent</th>
                                                    <th className="px-4 py-3 font-medium">Opened</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {sentInvites.map((invite) => (
                                                    <tr key={invite.id} className="hover:bg-white/5">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300">
                                                                    {(invite.recipientName || invite.email).charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-medium text-white">
                                                                        {invite.recipientName || 'Unknown'}
                                                                    </div>
                                                                    <div className="text-xs text-text-muted">{invite.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <StatusBadge status={invite.status} />
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-text-muted">
                                                            {formatDate(invite.sentAt || invite.createdAt)}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-text-muted">
                                                            {formatDate(invite.openedAt)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Result Notification */}
                        {result && (
                            <div className={`mx-4 mb-2 p-3 rounded-lg flex items-center justify-between ${result.type === 'success'
                                    ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                                    : 'bg-red-500/20 border border-red-500/30 text-red-300'
                                }`}>
                                <div className="flex items-center gap-2">
                                    {result.type === 'success' ? (
                                        <CheckCircle className="w-4 h-4" />
                                    ) : (
                                        <XCircle className="w-4 h-4" />
                                    )}
                                    <span className="text-sm">{result.message}</span>
                                </div>
                                <button
                                    onClick={() => setResult(null)}
                                    className="text-white/60 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Footer - Only show for suggestions/manual tabs */}
                        {activeTab !== 'sent' && (
                            <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
                                <div className="text-sm text-text-muted">
                                    {selectedEmails.size > 0 && <span>{selectedEmails.size} selected</span>}
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={handleSend}
                                    disabled={sending || (selectedEmails.size === 0 && !manualEmails.trim())}
                                    className="bg-white text-black hover:bg-gray-200"
                                >
                                    {sending ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sending...
                                        </span>
                                    ) : (
                                        'Send Invites'
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
