'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Users, Search, Check, Loader2 } from 'lucide-react';
import Modal from '@/components/modals/Modal';
import { Button } from '@/components/components/ui';
import { useAuth } from '@/contexts/AuthContext';

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    eventTitle: string;
}

type InviteTab = 'suggestions' | 'manual';

export default function InviteModal({ isOpen, onClose, eventId, eventTitle }: InviteModalProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<InviteTab>('suggestions');
    const [manualEmails, setManualEmails] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [remaining, setRemaining] = useState<number | null>(null);

    // Fetch Suggestions on Open
    useEffect(() => {
        if (isOpen && activeTab === 'suggestions') {
            fetchSuggestions();
        }
    }, [isOpen, activeTab]);

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
            // Use global search (Phase 2)
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
            // Combine manual + selected
            const emailsToSend = new Set(selectedEmails);

            // Parse manual input
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

                let message = `Sent ${sentCount} invites!`;
                if (failed.length > 0) {
                    message += `\n\n${failed.length} failed:\n` + failed.map((f: any) => `- ${f.email}: ${f.reason}`).join('\n');
                }

                alert(message);

                // Only close/clear if at least some were sent or if user acknowledges
                onClose();
                setManualEmails('');
                setSelectedEmails(new Set());
            } else {
                const errorData = await res.json();
                alert(`Failed to send invites: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Send error:', error);
            alert('An unexpected error occurred. Please try again.'); // Fallback alert
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
            maxWidth="max-w-4xl"
        >
            <div className="flex h-[500px] w-full text-white">
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
                    ) : (
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
                    )}

                    {/* Footer */}
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
                </div>
            </div>
        </Modal>
    );
}
