/**
 * Subscribable Calendar Card (Luma-style)
 * Matches Luma's Featured Calendars design exactly
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { MapPin, Loader2 } from 'lucide-react';
import { FeaturedCalendar } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
    subscribeToCalendar,
    unsubscribeFromCalendar,
    isSubscribed,
} from '@/lib/services/subscription.service';

interface SubscribableCalendarCardProps {
    calendar: FeaturedCalendar;
    index: number;
}

export default function SubscribableCalendarCard({ calendar, index }: SubscribableCalendarCardProps) {
    const { user } = useAuth();
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkSubscription = async () => {
            if (user) {
                const status = await isSubscribed(user.uid, calendar.id);
                setSubscribed(status);
            }
            setChecking(false);
        };
        checkSubscription();
    }, [user, calendar.id]);

    const handleSubscribe = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            alert('Please sign in to subscribe to calendars');
            return;
        }

        setLoading(true);
        try {
            if (subscribed) {
                await unsubscribeFromCalendar(user.uid, calendar.id);
                setSubscribed(false);
            } else {
                await subscribeToCalendar(user.uid, calendar.id);
                setSubscribed(true);
            }
        } catch (err) {
            console.error('Subscription error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: index * 0.05,
                ease: [0.22, 1, 0.36, 1],
            }}
            className="bg-white/2 border border-white/6 rounded-xl p-5 hover:bg-white/4 transition-colors cursor-pointer"
        >
            {/* Header: Avatar + Subscribe Button */}
            <div className="flex justify-between items-start mb-4">
                {/* Square Avatar */}
                <div className="w-[52px] h-[52px] rounded-lg overflow-hidden relative bg-white/5 shrink-0">
                    <Image
                        src={calendar.avatar}
                        alt={calendar.name}
                        fill
                        className="object-cover"
                    />
                </div>

                {/* Subscribe Button */}
                <button
                    onClick={handleSubscribe}
                    disabled={loading || checking}
                    className="px-4 py-1.5 rounded-full text-[12px] font-medium bg-white/8 text-white/80 hover:bg-white/12 transition-colors border border-white/8"
                >
                    {loading || checking ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : subscribed ? (
                        'Subscribed'
                    ) : (
                        'Subscribe'
                    )}
                </button>
            </div>

            {/* Calendar Name */}
            <h3 className="text-[15px] font-semibold text-white mb-2 leading-snug">
                {calendar.name}
            </h3>

            {/* Location or Description */}
            {calendar.location ? (
                <p className="text-[13px] text-white/50 flex items-center gap-1">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{calendar.location}</span>
                    <span className="mx-1">·</span>
                    <span className="line-clamp-1">{calendar.description}</span>
                </p>
            ) : (
                <p className="text-[13px] text-white/50 line-clamp-2 leading-relaxed">
                    {calendar.description}
                </p>
            )}
        </motion.div>
    );
}
