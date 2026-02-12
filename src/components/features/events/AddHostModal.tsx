'use client';

import { useState } from 'react';
import Modal from '@/components/modals/Modal';
import { Button } from '@/components/components/ui';
import { Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AddHostModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    onHostAdded: () => void;
}

export default function AddHostModal({ isOpen, onClose, eventId, onHostAdded }: AddHostModalProps) {
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/events/${eventId}/hosts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: email.trim() })
            });

            if (res.ok) {
                onHostAdded();
                onClose();
                setEmail('');
            } else {
                const error = await res.json();
                toast.error(`Failed to add host: ${error.error}`);
            }
        } catch (error) {
            console.error('Error adding host:', error);
            toast.error('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Host"
            maxWidth="max-w-md"
        >
            <div className="p-6">
                <p className="text-sm text-text-muted mb-6">
                    Add a host to help manage this event. They will be able to edit event details, manage guests, and scan tickets.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
                            Host Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="hover:bg-white/5 text-text-muted hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={loading || !email.trim()}
                            className="bg-white text-black hover:bg-gray-200"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Adding...
                                </span>
                            ) : (
                                'Add Host'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
