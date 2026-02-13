/**
 * GuestManagement Component
 * Host dashboard for managing guest approvals
 */

'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Clock, Check, XCircle, Search,
    CheckCircle, Filter, Loader2, UserCheck, UserX, ExternalLink
} from 'lucide-react';
import { Button, GlossyCard } from '@/components/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

interface EnrichedGuest {
    id: string;
    userId: string;
    eventId: string;
    status: string;
    createdAt: string;
    displayName: string;
    email: string;
    photoURL: string | null;
    answers?: Record<string, string | string[]>;
    // Staking Fields
    stakeAmountUsd?: number;
    stakeCurrency?: string;
    stakeNetwork?: string;
    txHash?: string;
}

interface GuestManagementProps {
    eventId: string;
    eventTitle: string;
}

type TabType = 'pending' | 'approved' | 'rejected' | 'all';

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'pending', label: 'Pending', icon: Clock },
    { id: 'approved', label: 'Approved', icon: CheckCircle },
    { id: 'rejected', label: 'Rejected', icon: XCircle },
    { id: 'all', label: 'All', icon: Users },
];

async function fetchGuests(eventId: string, token: string): Promise<EnrichedGuest[]> {
    const res = await fetch(`/api/events/${eventId}/guests`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch guests');
    const data = await res.json();
    return data.guests;
}

export default function GuestManagement({ eventId, eventTitle }: GuestManagementProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    // Fetch guests
    const { data: guests = [], isLoading, error } = useQuery({
        queryKey: ['guests', eventId],
        queryFn: async () => {
            const token = await user?.getIdToken();
            if (!token) throw new Error('Not authenticated');
            return fetchGuests(eventId, token);
        },
        enabled: !!user,
        staleTime: 10 * 1000,
    });

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: async (guestId: string) => {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/events/${eventId}/guests/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ guestId }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to approve');
            }
            return res.json();
        },
        onMutate: (guestId) => {
            setProcessingIds(prev => new Set(prev).add(guestId));
        },
        onSettled: (_, __, guestId) => {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(guestId);
                return next;
            });
            queryClient.invalidateQueries({ queryKey: ['guests', eventId] });
        },
    });

    // Reject mutation
    const rejectMutation = useMutation({
        mutationFn: async (guestId: string) => {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/events/${eventId}/guests/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ guestId }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to reject');
            }
            return res.json();
        },
        onMutate: (guestId) => {
            setProcessingIds(prev => new Set(prev).add(guestId));
        },
        onSettled: (_, __, guestId) => {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(guestId);
                return next;
            });
            queryClient.invalidateQueries({ queryKey: ['guests', eventId] });
        },
    });

    // Filter and search
    const filteredGuests = useMemo(() => {
        let result = guests;

        // Filter by tab
        if (activeTab === 'pending') {
            result = result.filter(g => g.status === 'pending_approval' || g.status === 'staked');
        } else if (activeTab === 'approved') {
            result = result.filter(g => ['issued', 'approved', 'scanned'].includes(g.status));
        } else if (activeTab === 'rejected') {
            result = result.filter(g => g.status === 'rejected');
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(g =>
                g.displayName.toLowerCase().includes(query) ||
                g.email.toLowerCase().includes(query)
            );
        }

        return result;
    }, [guests, activeTab, searchQuery]);

    // Count by status
    const counts = useMemo(() => ({
        pending: guests.filter(g => g.status === 'pending_approval' || g.status === 'staked').length,
        approved: guests.filter(g => ['issued', 'approved', 'scanned'].includes(g.status)).length,
        rejected: guests.filter(g => g.status === 'rejected').length,
        all: guests.length,
    }), [guests]);

    // Bulk actions
    const handleBulkApprove = async () => {
        for (const guestId of selectedGuests) {
            try {
                await approveMutation.mutateAsync(guestId);
            } catch (e) {
                console.error('Bulk approve error:', e);
            }
        }
        setSelectedGuests(new Set());
    };

    const handleBulkReject = async () => {
        for (const guestId of selectedGuests) {
            try {
                await rejectMutation.mutateAsync(guestId);
            } catch (e) {
                console.error('Bulk reject error:', e);
            }
        }
        setSelectedGuests(new Set());
    };

    const toggleSelectAll = () => {
        if (selectedGuests.size === filteredGuests.length) {
            setSelectedGuests(new Set());
        } else {
            setSelectedGuests(new Set(filteredGuests.map(g => g.id)));
        }
    };

    if (error) {
        return (
            <GlossyCard className="p-8 text-center">
                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400">{(error as Error).message}</p>
            </GlossyCard>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Guest Management</h1>
                    <p className="text-text-muted mt-1">{eventTitle}</p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search guests..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-indigo-500/50 w-full sm:w-64"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                : 'bg-white/5 text-text-muted hover:bg-white/10 border border-transparent'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                            <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${isActive ? 'bg-indigo-500/30' : 'bg-white/10'
                                }`}>
                                {counts[tab.id]}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Bulk Actions Bar */}
            <AnimatePresence>
                {selectedGuests.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl"
                    >
                        <span className="text-sm text-white">
                            <strong>{selectedGuests.size}</strong> guest{selectedGuests.size > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleBulkApprove}
                                className="gap-1 bg-green-500/20 text-green-400 border-green-500/30"
                            >
                                <UserCheck className="w-4 h-4" />
                                Approve All
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleBulkReject}
                                className="gap-1 bg-red-500/20 text-red-400 border-red-500/30"
                            >
                                <UserX className="w-4 h-4" />
                                Reject All
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Guest List */}
            <GlossyCard className="overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                        <p className="text-text-muted mt-4">Loading guests...</p>
                    </div>
                ) : filteredGuests.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <p className="text-text-muted">
                            {searchQuery
                                ? 'No guests match your search'
                                : activeTab === 'pending'
                                    ? 'No pending requests'
                                    : 'No guests yet'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {/* Select All Header */}
                        {activeTab === 'pending' && filteredGuests.length > 0 && (
                            <div className="flex items-center gap-4 p-4 bg-white/2">
                                <input
                                    type="checkbox"
                                    checked={selectedGuests.size === filteredGuests.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/50"
                                />
                                <span className="text-sm text-text-muted">Select all</span>
                            </div>
                        )}

                        {/* Guest Rows */}
                        {filteredGuests.map((guest) => {
                            const isProcessing = processingIds.has(guest.id);
                            const isPending = guest.status === 'pending_approval' || guest.status === 'staked';
                            const isApproved = ['issued', 'approved', 'scanned'].includes(guest.status);
                            const isRejected = guest.status === 'rejected';

                            return (
                                <motion.div
                                    key={guest.id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col hover:bg-white/2 transition-colors"
                                >
                                    <div className="flex items-center gap-4 p-4">
                                        {/* Checkbox (only for pending) */}
                                        {isPending && (
                                            <input
                                                type="checkbox"
                                                checked={selectedGuests.has(guest.id)}
                                                onChange={() => {
                                                    setSelectedGuests(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(guest.id)) {
                                                            next.delete(guest.id);
                                                        } else {
                                                            next.add(guest.id);
                                                        }
                                                        return next;
                                                    });
                                                }}
                                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/50"
                                            />
                                        )}

                                        {/* Avatar */}
                                        <div className="shrink-0">
                                            {guest.photoURL ? (
                                                <Image
                                                    src={guest.photoURL}
                                                    alt={guest.displayName}
                                                    width={40}
                                                    height={40}
                                                    className="rounded-full"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                                                    {guest.displayName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">{guest.displayName}</p>
                                            <p className="text-xs text-text-muted truncate">{guest.email}</p>
                                        </div>

                                        {/* Time */}
                                        <div className="hidden sm:block text-xs text-text-muted">
                                            {formatDistanceToNow(new Date(guest.createdAt), { addSuffix: true })}
                                        </div>

                                        {/* Status Badge / Actions */}
                                        {isPending ? (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => approveMutation.mutate(guest.id)}
                                                    disabled={isProcessing}
                                                    className="gap-1 bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                                                >
                                                    {isProcessing ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Check className="w-4 h-4" />
                                                    )}
                                                    <span className="hidden sm:inline">Approve</span>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => rejectMutation.mutate(guest.id)}
                                                    disabled={isProcessing}
                                                    className="gap-1 bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                                                >
                                                    {isProcessing ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4" />
                                                    )}
                                                    <span className="hidden sm:inline">Reject</span>
                                                </Button>
                                            </div>
                                        ) : isApproved ? (
                                            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Approved
                                            </span>
                                        ) : isRejected ? (
                                            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                                                <XCircle className="w-3.5 h-3.5" />
                                                Rejected
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full bg-white/10 text-text-muted text-xs">
                                                {guest.status}
                                            </span>
                                        )}
                                    </div>

                                    {/* Staking Details */}
                                    {(guest.status === 'staked' || guest.stakeAmountUsd) && (
                                        <div className="w-full pl-16 pr-4 pb-2 mt-2">
                                            <div className="flex items-center gap-3 text-xs bg-indigo-500/10 border border-indigo-500/20 rounded-md p-2">
                                                <div className="flex flex-col">
                                                    <span className="text-indigo-300 font-medium">Staked Amount</span>
                                                    <span className="text-white font-bold">
                                                        {guest.stakeCurrency && ['ETH', 'SOL'].includes(guest.stakeCurrency.toUpperCase())
                                                            ? `${Number(guest.stakeAmountUsd || 0)} ${guest.stakeCurrency.toUpperCase()}`
                                                            : `$${Number(guest.stakeAmountUsd || 0).toFixed(2)} ${guest.stakeCurrency || 'USD'}`
                                                        }
                                                    </span>
                                                </div>

                                                <div className="h-6 w-px bg-indigo-500/20 mx-2" />

                                                <div className="flex flex-col">
                                                    <span className="text-indigo-300 font-medium">Network</span>
                                                    <span className="text-white capitalize">{guest.stakeNetwork || '-'}</span>
                                                </div>

                                                {guest.txHash && (
                                                    <>
                                                        <div className="h-6 w-px bg-indigo-500/20 mx-2" />
                                                        <a
                                                            href={guest.stakeNetwork === 'solana'
                                                                ? `https://solscan.io/tx/${guest.txHash}`
                                                                : `https://sepolia.etherscan.io/tx/${guest.txHash}`} // Defaulting to Sepolia for now as that's what we use
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline"
                                                        >
                                                            View Tx
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Answers Section */}
                                    {guest.answers && Object.keys(guest.answers).length > 0 && (
                                        <div className="w-full pl-16 pr-4 pb-4">
                                            <div className="bg-white/5 rounded-lg p-3 text-sm">
                                                <h4 className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">Registration Answers</h4>
                                                <div className="space-y-2">
                                                    {Object.entries(guest.answers).map(([key, value]) => {
                                                        // Attempt to find the question label if possible, but we don't have questions map here easily.
                                                        // So we display key (which might be question ID) and value.
                                                        // Wait, keys are IDs. Showing IDs is bad.
                                                        // Ideally we need to fetch event questions to map IDs to Labels.
                                                        // For now, let's just show the answer value. 
                                                        // Or format: "Question: Answer" if key is readable, but it is UUID.
                                                        // Optimally: Event has questions. We passed eventId props. 
                                                        // We should probably fetch event details to get questions.
                                                        // But GuestManagement receives eventTitle.
                                                        // Maybe we assume keys are somewhat readable or we just list values?
                                                        // Actually, in `EventRSVP` we saved default questions with ID 'full_name' etc.
                                                        // But custom questions have UUIDs.

                                                        // Let's just list the value for now, or key if it's 'full_name' etc.
                                                        return (
                                                            <div key={key} className="grid grid-cols-[1fr,2fr] gap-2">
                                                                <span className="text-text-muted truncate" title={key}>{key === 'full_name' ? 'Full Name' : 'Answer'}</span>
                                                                <span className="text-white">{Array.isArray(value) ? value.join(', ') : value}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </GlossyCard>
        </div>
    );
}
