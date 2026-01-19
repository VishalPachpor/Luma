/**
 * Phone Number Section Component
 * Displays and manages phone number for SMS login
 */

'use client';

import { useState } from 'react';
import { GlossyCard, Button } from '@/components/components/ui';
import { Phone, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function PhoneSection() {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');

    const hasPhone = !!user?.phoneNumber;

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-xl font-bold text-text-primary">Phone Number</h3>
                <p className="text-sm text-text-secondary mt-1">
                    Manage the phone number you use to sign in to Pulse and receive SMS updates.
                </p>
            </div>

            {/* SMS Subscription Notice */}
            {hasPhone && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-yellow-400 font-medium">
                            You&apos;ve unsubscribed from Pulse messages.
                        </p>
                        <p className="text-xs text-yellow-400/70 mt-1">
                            Send <span className="font-bold">START</span> via WhatsApp to resume receiving messages.
                        </p>
                    </div>
                </div>
            )}

            <GlossyCard className="p-6">
                <div className="flex items-center gap-4">
                    <Phone className="w-5 h-5 text-text-muted shrink-0" />
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Phone Number
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+1 234 567 8900"
                                disabled={!isEditing}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent/50 outline-none transition-colors disabled:opacity-70"
                            />
                            <Button
                                variant={isEditing ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => {
                                    if (isEditing) {
                                        // TODO: Implement phone update with verification
                                        setIsEditing(false);
                                    } else {
                                        setIsEditing(true);
                                    }
                                }}
                            >
                                {isEditing ? 'Save' : 'Update'}
                            </Button>
                        </div>
                        <p className="text-xs text-text-muted mt-2">
                            For your security, we will send you a code to verify any change to your phone number.
                        </p>
                    </div>
                </div>
            </GlossyCard>
        </section>
    );
}
