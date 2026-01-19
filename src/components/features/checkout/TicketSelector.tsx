/**
 * TicketSelector Component
 * Displays available ticket tiers for an event
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Minus, Plus, Loader2 } from 'lucide-react';
import { TicketTier } from '@/types/commerce';
import { Button, GlossyCard } from '@/components/components/ui';

interface TicketSelectorProps {
    tiers: TicketTier[];
    onSelect: (tier: TicketTier, quantity: number) => void;
    isLoading?: boolean;
}

export default function TicketSelector({ tiers, onSelect, isLoading }: TicketSelectorProps) {
    const [selectedTier, setSelectedTier] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);

    if (!tiers || tiers.length === 0) {
        return (
            <GlossyCard className="p-8 text-center">
                <Ticket className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-text-muted">No tickets available for this event.</p>
            </GlossyCard>
        );
    }

    const handleSelect = (tier: TicketTier) => {
        setSelectedTier(tier.id);
        setQuantity(1);
    };

    const handleCheckout = () => {
        const tier = tiers.find(t => t.id === selectedTier);
        if (tier) {
            onSelect(tier, quantity);
        }
    };

    const currentTier = tiers.find(t => t.id === selectedTier);
    const maxQty = currentTier?.maxPerOrder || 10;

    return (
        <div className="space-y-4">
            {/* Tier Selection */}
            <div className="space-y-3">
                {tiers.map((tier) => {
                    const isActive = selectedTier === tier.id;
                    const remaining = tier.inventory;
                    const isSoldOut = remaining <= 0;

                    return (
                        <motion.div
                            key={tier.id}
                            onClick={() => !isSoldOut && handleSelect(tier)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${isActive
                                    ? 'bg-indigo-500/20 border-indigo-500/50'
                                    : isSoldOut
                                        ? 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }`}
                            whileHover={!isSoldOut ? { scale: 1.01 } : undefined}
                            whileTap={!isSoldOut ? { scale: 0.99 } : undefined}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-white font-semibold">{tier.name}</h3>
                                    {tier.description && (
                                        <p className="text-text-muted text-sm mt-1">{tier.description}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-white">
                                        {tier.price === 0 ? (
                                            'Free'
                                        ) : (
                                            <>
                                                {tier.price} <span className="text-sm text-text-muted">{tier.currency}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className={`text-xs ${isSoldOut ? 'text-red-400' : 'text-text-muted'}`}>
                                        {isSoldOut ? 'Sold Out' : `${remaining} left`}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Quantity Selector (when tier selected) */}
            <AnimatePresence>
                {selectedTier && currentTier && currentTier.price > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-white/5 rounded-xl border border-white/10"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-white">Quantity</span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    disabled={quantity <= 1}
                                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white disabled:opacity-50"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="text-white font-bold w-8 text-center">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                                    disabled={quantity >= maxQty}
                                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                            <span className="text-text-muted">Total</span>
                            <span className="text-xl font-bold text-white">
                                {(currentTier.price * quantity).toFixed(4)} {currentTier.currency}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Checkout Button */}
            {selectedTier && (
                <Button
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-purple-500"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                        </>
                    ) : currentTier?.price === 0 ? (
                        'Register for Free'
                    ) : (
                        <>
                            <Ticket className="w-4 h-4" />
                            Pay with Crypto
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}
