/**
 * Payment Section
 * Displays payment methods, subscription, and transaction history
 */

'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { GlossyCard } from '@/components/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import PaymentMethods from '../components/PaymentMethods';
import PremiumSubscription from '../components/PremiumSubscription';
import PaymentHistory from '../components/PaymentHistory';

export default function PaymentSection() {
    const { user, loading } = useAuth();

    // Not logged in state
    if (!user && !loading) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <GlossyCard className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                    <h3 className="text-lg font-bold text-text-primary mb-2">Sign In Required</h3>
                    <p className="text-text-secondary">
                        Please sign in to manage your payment settings.
                    </p>
                </GlossyCard>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <GlossyCard className="p-12 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
                    <p className="text-text-secondary">Loading payment settings...</p>
                </GlossyCard>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Payment Methods */}
            <PaymentMethods />

            {/* Premium Subscription */}
            <PremiumSubscription />

            {/* Payment History */}
            <PaymentHistory />
        </div>
    );
}
