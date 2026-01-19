/**
 * Invite Sender Component
 * Allows users to invite others to events via email
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, Loader2, Check, X, UserPlus } from 'lucide-react';
import { Button } from '@/components/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { sendInviteEmail } from '@/lib/services/invite.service';

interface InviteSenderProps {
    eventId: string;
    eventTitle: string;
}

export default function InviteSender({ eventId, eventTitle }: InviteSenderProps) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSend = async () => {
        if (!user) {
            setError('Please sign in to send invites');
            return;
        }

        if (!email.trim()) {
            setError('Please enter an email address');
            return;
        }

        setSending(true);
        setError(null);

        const result = await sendInviteEmail(eventId, eventTitle, email, {
            uid: user.uid,
            name: user.displayName || 'Someone',
            email: user.email || '',
        });

        setSending(false);

        if (result.success) {
            setSuccess(true);
            setEmail('');
            setTimeout(() => {
                setSuccess(false);
                setIsOpen(false);
            }, 2000);
        } else {
            setError(result.error || 'Failed to send invite');
        }
    };

    return (
        <div className="relative">
            <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="gap-2"
                disabled={!user}
            >
                <UserPlus className="w-4 h-4" />
                Invite Friend
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-80 bg-bg-secondary border border-white/10 rounded-xl shadow-2xl p-4 z-50"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-text-primary flex items-center gap-2">
                                <Mail className="w-4 h-4 text-accent" />
                                Send Invite
                            </h4>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-text-muted hover:text-text-primary transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <input
                                type="email"
                                placeholder="friend@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={sending}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 text-sm"
                            />

                            {error && (
                                <p className="text-xs text-red-400">{error}</p>
                            )}

                            <Button
                                fullWidth
                                size="sm"
                                onClick={handleSend}
                                disabled={sending || success}
                                className="gap-2"
                            >
                                {success ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Invite Sent!
                                    </>
                                ) : sending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Send Invite
                                    </>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
