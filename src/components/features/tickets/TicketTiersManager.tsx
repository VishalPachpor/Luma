/**
 * TicketTiersManager Component
 * Organizer interface for creating and managing ticket tiers
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Ticket, Loader2, Trash2, Edit, Save, X } from 'lucide-react';
import { Button, GlossyCard } from '@/components/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { TicketTier, TicketType } from '@/types/commerce';

interface TicketTiersManagerProps {
    eventId: string;
    eventTitle: string;
}

async function fetchTiers(eventId: string): Promise<TicketTier[]> {
    const res = await fetch(`/api/events/${eventId}/tickets`);
    if (!res.ok) throw new Error('Failed to fetch tiers');
    const data = await res.json();
    return data.tiers;
}

export default function TicketTiersManager({ eventId, eventTitle }: TicketTiersManagerProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingTier, setEditingTier] = useState<TicketTier | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '0',
        currency: 'ETH',
        type: 'crypto' as TicketType,
        inventory: '100',
        maxPerOrder: '10',
    });

    const { data: tiers = [], isLoading, error } = useQuery({
        queryKey: ['ticket-tiers', eventId],
        queryFn: () => fetchTiers(eventId),
    });

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/events/${eventId}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-tiers', eventId] });
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (tierId: string) => {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/events/${eventId}/tickets?tierId=${tierId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to delete');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-tiers', eventId] });
        },
    });

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            price: '0',
            currency: 'ETH',
            type: 'crypto',
            inventory: '100',
            maxPerOrder: '10',
        });
        setShowForm(false);
        setEditingTier(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    if (error) {
        return (
            <GlossyCard className="p-8 text-center">
                <p className="text-red-400">{(error as Error).message}</p>
            </GlossyCard>
        );
    }

    return (
        <div className="space-y-6">
            {/* Add Tier Button */}
            {!showForm && (
                <Button
                    onClick={() => setShowForm(true)}
                    className="gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Ticket Tier
                </Button>
            )}

            {/* Create/Edit Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <GlossyCard className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <h3 className="text-lg font-semibold text-white mb-4">
                                    {editingTier ? 'Edit Ticket Tier' : 'Create Ticket Tier'}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-text-muted mb-1">Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. General Admission"
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:border-indigo-500/50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-text-muted mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Optional description"
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:border-indigo-500/50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-text-muted mb-1">Price *</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                step="0.0001"
                                                min="0"
                                                required
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:border-indigo-500/50"
                                            />
                                            <select
                                                value={formData.currency}
                                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500/50"
                                            >
                                                <option value="ETH">ETH</option>
                                                <option value="SOL">SOL</option>
                                                <option value="USDC">USDC</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-text-muted mb-1">Inventory *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={formData.inventory}
                                            onChange={(e) => setFormData({ ...formData, inventory: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:border-indigo-500/50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-text-muted mb-1">Max Per Order</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.maxPerOrder}
                                            onChange={(e) => setFormData({ ...formData, maxPerOrder: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:border-indigo-500/50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-text-muted mb-1">Type</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value as TicketType })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500/50"
                                        >
                                            <option value="free">Free</option>
                                            <option value="crypto">Crypto</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={resetForm}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={createMutation.isPending}
                                        className="gap-2"
                                    >
                                        {createMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        {editingTier ? 'Update Tier' : 'Create Tier'}
                                    </Button>
                                </div>
                            </form>
                        </GlossyCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tier List */}
            <div className="space-y-3">
                {isLoading ? (
                    <GlossyCard className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                        <p className="text-text-muted mt-4">Loading tiers...</p>
                    </GlossyCard>
                ) : tiers.length === 0 ? (
                    <GlossyCard className="p-8 text-center">
                        <Ticket className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <p className="text-text-muted">No ticket tiers yet. Create one to start selling tickets.</p>
                    </GlossyCard>
                ) : (
                    tiers.map((tier) => (
                        <GlossyCard key={tier.id} className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-white font-semibold">{tier.name}</h4>
                                    {tier.description && (
                                        <p className="text-text-muted text-sm">{tier.description}</p>
                                    )}
                                    <div className="flex gap-4 mt-2 text-sm text-text-muted">
                                        <span>{tier.inventory} available</span>
                                        <span>Max {tier.maxPerOrder}/order</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-white">
                                            {tier.price === 0 ? 'Free' : `${tier.price} ${tier.currency}`}
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded ${tier.type === 'free' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
                                            }`}>
                                            {tier.type}
                                        </span>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => deleteMutation.mutate(tier.id)}
                                        disabled={deleteMutation.isPending}
                                        className="text-red-400 hover:bg-red-500/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </GlossyCard>
                    ))
                )}
            </div>
        </div>
    );
}
