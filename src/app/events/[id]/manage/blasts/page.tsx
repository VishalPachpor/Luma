'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
    MessageSquare,
    Send,
    Clock,
    CheckCircle2,
    Users,
    ChevronDown,
    Loader2,
    AlertCircle,
    Mail,
    Filter,
} from 'lucide-react';

interface Blast {
    id: string;
    subject: string;
    message: string;
    recipient_filter: string;
    recipient_count: number;
    sent_count: number;
    failed_count: number;
    status: 'sending' | 'sent' | 'failed';
    created_at: string;
    sent_at: string | null;
}

const FILTER_OPTIONS = [
    { value: 'all', label: 'All Guests', description: 'Everyone registered' },
    { value: 'approved', label: 'Approved', description: 'Approved attendees only' },
    { value: 'pending', label: 'Pending', description: 'Awaiting approval' },
    { value: 'checked_in', label: 'Checked In', description: 'Already checked in' },
];

export default function BlastsPage() {
    const params = useParams();
    const eventId = params.id as string;

    const [blasts, setBlasts] = useState<Blast[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Compose form state
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [recipientFilter, setRecipientFilter] = useState('all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    const fetchBlasts = useCallback(async () => {
        try {
            const response = await fetch(`/api/events/${eventId}/blasts`);
            const data = await response.json();
            if (data.blasts) {
                setBlasts(data.blasts);
            }
        } catch {
            console.error('[Blasts] Failed to fetch');
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchBlasts();
    }, [fetchBlasts]);

    const handleSendBlast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) return;

        setSending(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(`/api/events/${eventId}/blasts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, message, recipientFilter }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send blast');
            }

            setSuccess(`Blast sent to ${data.blast.recipientCount} recipients`);
            setSubject('');
            setMessage('');
            setShowCompose(false);
            await fetchBlasts();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to send blast');
        } finally {
            setSending(false);
        }
    };

    const filterLabel = FILTER_OPTIONS.find(f => f.value === recipientFilter)?.label || 'All Guests';

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Blasts</h1>
                    <p className="text-white/40 mt-1">Send updates and announcements to your guests</p>
                </div>
                <button
                    onClick={() => setShowCompose(!showCompose)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
                >
                    <Mail size={16} />
                    Compose Blast
                </button>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                    <CheckCircle2 size={16} />
                    {success}
                </div>
            )}

            {/* Compose Form */}
            {showCompose && (
                <form
                    onSubmit={handleSendBlast}
                    className="bg-surface-1 border border-white/10 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
                >
                    <div className="p-6 space-y-5">
                        {/* Recipient Filter */}
                        <div>
                            <label className="text-sm font-medium text-white/60 mb-2 block">Recipients</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                    className="w-full flex items-center justify-between px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white hover:border-white/20 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Filter size={14} className="text-white/40" />
                                        <span>{filterLabel}</span>
                                    </div>
                                    <ChevronDown size={14} className={`text-white/40 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {showFilterDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-white/10 rounded-xl overflow-hidden z-10 shadow-xl">
                                        {FILTER_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    setRecipientFilter(option.value);
                                                    setShowFilterDropdown(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors ${recipientFilter === option.value ? 'bg-white/5' : ''}`}
                                            >
                                                <p className="text-sm text-white font-medium">{option.label}</p>
                                                <p className="text-xs text-white/40">{option.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="text-sm font-medium text-white/60 mb-2 block">Subject</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Important update about the event..."
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
                                required
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label className="text-sm font-medium text-white/60 mb-2 block">Message</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Write your message to guests..."
                                rows={6}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-white/20 transition-colors resize-none leading-relaxed"
                                required
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between px-6 py-4 bg-white/2 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => setShowCompose(false)}
                            className="text-sm text-white/40 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={sending || !subject.trim() || !message.trim()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {sending ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send size={14} />
                                    Send Blast
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* Blast History */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-surface-1 border border-white/5 rounded-2xl p-6 animate-pulse">
                            <div className="h-5 w-48 bg-white/10 rounded mb-3" />
                            <div className="h-4 w-32 bg-white/10 rounded" />
                        </div>
                    ))}
                </div>
            ) : blasts.length === 0 ? (
                <EmptyState onCompose={() => setShowCompose(true)} />
            ) : (
                <div className="space-y-3">
                    <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">History</h2>
                    {blasts.map((blast) => (
                        <BlastHistoryCard key={blast.id} blast={blast} />
                    ))}
                </div>
            )}
        </div>
    );
}

function BlastHistoryCard({ blast }: { blast: Blast }) {
    const statusConfig = {
        sending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Sending' },
        sent: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Sent' },
        failed: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Failed' },
    };

    const status = statusConfig[blast.status] || statusConfig.sending;
    const StatusIcon = status.icon;

    const timeAgo = getRelativeTime(blast.created_at);

    return (
        <div className="bg-surface-1 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors group">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-medium truncate">{blast.subject}</h3>
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                            <StatusIcon size={12} />
                            {status.label}
                        </span>
                    </div>

                    <p className="text-sm text-white/40 line-clamp-2 mb-3">
                        {blast.message}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-white/30">
                        <span className="flex items-center gap-1">
                            <Users size={12} />
                            {blast.sent_count || blast.recipient_count} recipients
                        </span>
                        {blast.failed_count > 0 && (
                            <span className="flex items-center gap-1 text-red-400/60">
                                <AlertCircle size={12} />
                                {blast.failed_count} failed
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {timeAgo}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ onCompose }: { onCompose: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-5 bg-white/5 rounded-2xl mb-5">
                <MessageSquare className="w-10 h-10 text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No blasts sent yet</h2>
            <p className="text-white/40 max-w-sm mb-6 leading-relaxed">
                Send updates, reminders, and announcements to your event guests via email.
            </p>
            <button
                onClick={onCompose}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-400 transition-colors"
            >
                <Send size={14} />
                Send Your First Blast
            </button>
        </div>
    );
}

function getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
