'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
    Mail,
    Send,
    Clock,
    CheckCircle2,
    Users,
    Loader2,
    AlertCircle,
} from 'lucide-react';

interface Newsletter {
    id: string;
    subject: string;
    message: string;
    recipient_count: number;
    sent_count: number;
    failed_count: number;
    status: 'sending' | 'sent' | 'failed';
    created_at: string;
    sent_at: string | null;
}

export default function CalendarNewslettersPage() {
    const params = useParams();
    const calendarId = params.id as string;

    const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    const fetchNewsletters = useCallback(async () => {
        try {
            const response = await fetch(`/api/calendars/${calendarId}/newsletters`);
            const data = await response.json();
            if (data.newsletters) {
                setNewsletters(data.newsletters);
            }
        } catch {
            console.error('[Newsletters] Failed to fetch');
        } finally {
            setLoading(false);
        }
    }, [calendarId]);

    useEffect(() => {
        fetchNewsletters();
    }, [fetchNewsletters]);

    const handleSendNewsletter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) return;

        setSending(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(`/api/calendars/${calendarId}/newsletters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, message }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send newsletter');
            }

            setSuccess(`Newsletter sent to ${data.newsletter.recipientCount} subscribers`);
            setSubject('');
            setMessage('');
            setShowCompose(false);
            await fetchNewsletters();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to send');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Newsletters</h1>
                    <p className="text-white/40 mt-1">Send email updates to your calendar subscribers</p>
                </div>
                <button
                    onClick={() => setShowCompose(!showCompose)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
                >
                    <Mail size={16} />
                    Compose Newsletter
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
                    onSubmit={handleSendNewsletter}
                    className="bg-surface-1 border border-white/10 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
                >
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="text-sm font-medium text-white/60 mb-2 block">Subject</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="What's new this week..."
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-white/60 mb-2 block">Message</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Write your newsletter content..."
                                rows={8}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-white/20 transition-colors resize-none leading-relaxed"
                                required
                            />
                        </div>
                    </div>

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
                                    Send Newsletter
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* Newsletter History */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-surface-1 border border-white/5 rounded-2xl p-6 animate-pulse">
                            <div className="h-5 w-48 bg-white/10 rounded mb-3" />
                            <div className="h-4 w-32 bg-white/10 rounded" />
                        </div>
                    ))}
                </div>
            ) : newsletters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-5 bg-white/5 rounded-2xl mb-5">
                        <Mail className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">No newsletters sent yet</h2>
                    <p className="text-white/40 max-w-sm mb-6 leading-relaxed">
                        Keep your subscribers informed with regular updates about upcoming events.
                    </p>
                    <button
                        onClick={() => setShowCompose(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-400 transition-colors"
                    >
                        <Send size={14} />
                        Send Your First Newsletter
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">History</h2>
                    {newsletters.map((newsletter) => (
                        <NewsletterCard key={newsletter.id} newsletter={newsletter} />
                    ))}
                </div>
            )}
        </div>
    );
}

function NewsletterCard({ newsletter }: { newsletter: Newsletter }) {
    const statusConfig = {
        sending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Sending' },
        sent: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Sent' },
        failed: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Failed' },
    };

    const status = statusConfig[newsletter.status] || statusConfig.sending;
    const StatusIcon = status.icon;

    const date = new Date(newsletter.created_at);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="bg-surface-1 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-medium truncate">{newsletter.subject}</h3>
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                            <StatusIcon size={12} />
                            {status.label}
                        </span>
                    </div>
                    <p className="text-sm text-white/40 line-clamp-2 mb-3">{newsletter.message}</p>
                    <div className="flex items-center gap-4 text-xs text-white/30">
                        <span className="flex items-center gap-1">
                            <Users size={12} />
                            {newsletter.sent_count || newsletter.recipient_count} subscribers
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formattedDate}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
