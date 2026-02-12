/**
 * Premium Subscription Component
 * Pulse Plus subscription management
 */

'use client';

import { useState } from 'react';
import { GlossyCard, Button } from '@/components/components/ui';
import { Sparkles, Check, ExternalLink, Loader2, ChevronRight, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    interval: 'month' | 'year';
    features: string[];
    isPopular?: boolean;
}

const PLANS: SubscriptionPlan[] = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'month',
        features: [
            'Create unlimited events',
            'Basic analytics',
            'Email notifications',
        ],
    },
    {
        id: 'plus_monthly',
        name: 'Pulse Plus',
        price: 9.99,
        interval: 'month',
        features: [
            '0% platform fees',
            'Higher invite limits',
            'Priority support',
            'Custom branding',
            'Advanced analytics',
        ],
        isPopular: true,
    },
    {
        id: 'plus_yearly',
        name: 'Pulse Plus',
        price: 99.99,
        interval: 'year',
        features: [
            'All monthly features',
            '2 months free',
            'Early access to new features',
        ],
    },
];

export default function PremiumSubscription() {
    const { user } = useAuth();
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [currentPlan] = useState('free'); // In production, fetch from Stripe

    const handleUpgrade = async (planId: string) => {
        setIsUpgrading(true);

        // Simulate loading
        setTimeout(() => {
            toast.info(
                'Stripe Subscription Integration Required. Set up Stripe Billing, create subscription products, and implement Stripe Checkout.'
            );
            setIsUpgrading(false);
        }, 1000);
    };

    if (!user) return null;

    const isPremium = currentPlan.includes('plus');

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Pulse Plus
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                    Enjoy 0% platform fees, higher invite and admin limits, priority support, and more.
                </p>
            </div>

            {/* Current Status Card */}
            <GlossyCard className={`p-6 ${isPremium ? 'border-yellow-500/30' : ''}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPremium
                            ? 'bg-linear-to-br from-yellow-500 to-orange-500'
                            : 'bg-white/10'
                            }`}>
                            {isPremium ? (
                                <Zap className="w-6 h-6 text-white" />
                            ) : (
                                <Sparkles className="w-6 h-6 text-text-muted" />
                            )}
                        </div>
                        <div>
                            <div className="font-bold text-text-primary">
                                {isPremium ? 'Pulse Plus Active' : 'Personal'}
                            </div>
                            <div className="text-sm text-text-secondary">
                                {isPremium
                                    ? 'Thank you for being a Plus member!'
                                    : 'Upgrade to unlock premium features'
                                }
                            </div>
                        </div>
                    </div>
                    {!isPremium && (
                        <Button
                            onClick={() => handleUpgrade('plus_monthly')}
                            disabled={isUpgrading}
                            className="gap-2 bg-linear-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400"
                        >
                            {isUpgrading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    Upgrade
                                    <ChevronRight className="w-4 h-4" />
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </GlossyCard>

            {/* Features List */}
            <GlossyCard className="p-6">
                <h4 className="font-semibold text-text-primary mb-4">Plus Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {PLANS[1].features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                            <span className="text-sm text-text-secondary">{feature}</span>
                        </div>
                    ))}
                </div>
            </GlossyCard>

            {/* Note */}
            <p className="text-xs text-text-muted flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Pulse Plus applies on the calendar level. Choose the desired calendar above to manage its membership.
            </p>
        </section >
    );
}
