/**
 * Payment Methods Component
 * Displays saved cards and add new card functionality
 */

'use client';

import { useState } from 'react';
import { GlossyCard, Button } from '@/components/components/ui';
import { CreditCard, Plus, Trash2, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PaymentMethod {
    id: string;
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
}

// Card brand icons
const CardBrandIcon = ({ brand }: { brand: string }) => {
    switch (brand.toLowerCase()) {
        case 'visa':
            return (
                <div className="w-8 h-5 bg-white rounded flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xs">VISA</span>
                </div>
            );
        case 'mastercard':
            return (
                <div className="w-8 h-5 bg-linear-to-r from-red-500 to-yellow-500 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">MC</span>
                </div>
            );
        case 'amex':
            return (
                <div className="w-8 h-5 bg-blue-500 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">AMEX</span>
                </div>
            );
        default:
            return <CreditCard className="w-5 h-5 text-text-muted" />;
    }
};

export default function PaymentMethods() {
    const { user } = useAuth();
    const [isAddingCard, setIsAddingCard] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

    const handleAddCard = async () => {
        // In production, this would open Stripe Elements or redirect to Stripe Checkout
        setIsAddingCard(true);

        // Simulate loading
        setTimeout(() => {
            toast.info(
                'Stripe Integration Required. Create a Stripe account, add STRIPE_PUBLISHABLE_KEY to .env.local, and install @stripe/stripe-js.'
            );
            setIsAddingCard(false);
        }, 1000);
    };

    const handleRemoveCard = (id: string) => {
        setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
    };

    if (!user) return null;

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-xl font-bold text-text-primary">Payment Methods</h3>
                <p className="text-sm text-text-secondary mt-1 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Your saved payment methods are encrypted and stored securely by Stripe.
                </p>
            </div>

            <GlossyCard className="p-6 space-y-4">
                {paymentMethods.length > 0 ? (
                    <div className="space-y-3">
                        {paymentMethods.map((pm) => (
                            <div
                                key={pm.id}
                                className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10"
                            >
                                <div className="flex items-center gap-4">
                                    <CardBrandIcon brand={pm.brand} />
                                    <div>
                                        <div className="font-medium text-text-primary">
                                            •••• •••• •••• {pm.last4}
                                        </div>
                                        <div className="text-xs text-text-muted">
                                            Expires {pm.expiryMonth.toString().padStart(2, '0')}/{pm.expiryYear}
                                            {pm.isDefault && (
                                                <span className="ml-2 text-accent">Default</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveCard(pm.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <CreditCard className="w-12 h-12 mx-auto mb-3 text-text-muted" />
                        <p className="text-text-secondary text-sm">
                            No payment methods saved yet.
                        </p>
                    </div>
                )}

                <Button
                    onClick={handleAddCard}
                    disabled={isAddingCard}
                    className="w-full gap-2"
                >
                    {isAddingCard ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Connecting to Stripe...
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4" />
                            Add Card
                        </>
                    )}
                </Button>
            </GlossyCard>
        </section>
    );
}
