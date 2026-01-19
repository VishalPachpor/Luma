/**
 * Event RSVP Component
 * Allows users to register/unregister for events
 * Supports Free RSVP (Write-heavy) and Paid Tickets (Crypto)
 */

'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Check, Loader2, Users, UserPlus, X, Bell, Clock } from 'lucide-react';
import { Button } from '@/components/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import {
    useUserRSVP,
    useEventAttendees,
    useRSVPToEvent,
    useCancelRSVP
} from '@/hooks/useRSVP';
import { RegistrationForm } from './RegistrationForm';
import { RSVPStatus } from '@/lib/services/rsvp.service';
import CryptoPaymentModal from '@/components/features/payments/CryptoPaymentModal';
import { useRouter } from 'next/navigation';
import { RegistrationQuestion } from '@/types/event';

interface EventRSVPProps {
    eventId: string;
    eventTitle: string;
    price?: number;
    registrationQuestions?: RegistrationQuestion[];
    requireApproval?: boolean;
}

export default function EventRSVP({ eventId, eventTitle, price = 0, registrationQuestions, requireApproval = false }: EventRSVPProps) {
    const { user } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    // State for Registration
    const [isRegistrationOpen, setRegistrationOpen] = useState(false);
    const [registrationAnswers, setRegistrationAnswers] = useState<Record<string, string | string[]>>({});

    // Payment State
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    // React Query Hooks (Data)
    const { data: userRsvp, isLoading: rsvpLoading } = useUserRSVP(eventId, user?.uid);
    const { data: attendees = [], isLoading: attendeesLoading } = useEventAttendees(eventId);

    // React Query Mutations (Actions)
    const { mutate: rsvp, isPending: isRsvping } = useRSVPToEvent();
    const { mutate: cancelRsvp, isPending: isCanceling } = useCancelRSVP();

    const rsvpStatus = userRsvp?.status || null;
    const loading = rsvpLoading || attendeesLoading;
    const isFree = !price || price === 0;

    // Crypto Price (Fixed constants for MVP)
    const solAmount = price > 0 ? Number((price * 0.005).toFixed(3)) : 0;
    const ethAmount = price > 0 ? Number((price * 0.0003).toFixed(4)) : 0;

    // Default questions if none provided (Senior Integrations Engineer fix for empty data)
    const effectiveQuestions: RegistrationQuestion[] = (registrationQuestions && registrationQuestions.length > 0)
        ? registrationQuestions
        : [{ id: 'full_name', type: 'short_text', label: 'Full Name', required: true }];

    // Actions
    const handleRegisterClick = (status: RSVPStatus) => {
        if (!user) {
            alert('Please sign in to register for events');
            return;
        }

        // If event has questions (or we forced default ones), show registration form for 'going'
        if (status === 'going' && effectiveQuestions.length > 0 && Object.keys(registrationAnswers).length === 0) {
            setRegistrationOpen(true);
            return;
        }

        if (status === 'going' && !isFree) {
            // Paid flow -> Open Payment Modal
            setPaymentModalOpen(true);
        } else {
            // Free flow -> Direct RSVP
            performRSVP(status, registrationAnswers);
        }
    };

    const handleRegistrationSubmit = (answers: Record<string, string | string[]>) => {
        setRegistrationAnswers(answers);
        setRegistrationOpen(false);

        // Continue with flow
        if (!isFree) {
            setPaymentModalOpen(true);
        } else {
            performRSVP('going', answers);
        }
    };

    const performRSVP = async (status: RSVPStatus, answers?: Record<string, string | string[]>) => {
        if (!user) return;

        // Use new Server Action for Dual-Write
        // Pass requireApproval to determine initial guest status
        try {
            // Call server action via dynamic import
            const result = await import('@/actions/event.actions').then(mod =>
                mod.registerForEvent(eventId, user.uid, requireApproval, answers)
            );

            if (result.success) {
                // Invalidate queries to refresh UI
                queryClient.invalidateQueries({ queryKey: ['rsvps', 'user', eventId, user.uid] });
                queryClient.invalidateQueries({ queryKey: ['rsvps', 'attendees', eventId] });
                // The original code didn't set rsvpStatus directly, it relied on query invalidation.
                // Keeping the original query invalidation logic.
                // setRsvpStatus(result.status as RSVPStatus); // This line is from the instruction, but setRsvpStatus is not defined.
                setRegistrationOpen(false); // Close modal if open
            } else {
                console.error('RSVP failed:', result.error);
                alert(result.error || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('RSVP error:', error);
            alert('An unexpected error occurred');
        } finally {
            // setIsLoading(false); // This line is from the instruction, but setIsLoading is not defined.
        }
    };

    const handlePaymentSuccess = async (data: { signature: string; chain: 'solana' | 'ethereum' }) => {
        setIsVerifying(true);

        try {
            const { signature, chain } = data;
            const amountPaid = chain === 'solana' ? solAmount : ethAmount;

            // 1. Call Verification API to fulfill order
            const res = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reference: signature,
                    eventId,
                    userId: user!.uid,
                    amount: amountPaid,
                    chain,
                    answers: registrationAnswers // Pass answers to verification API
                })
            });

            const resData = await res.json();

            if (!res.ok) throw new Error(resData.error || 'Verification failed');

            // 2. Invalidate cache to refresh RSVP state immediately
            queryClient.invalidateQueries({ queryKey: ['rsvps', 'user', eventId, user!.uid] });
            queryClient.invalidateQueries({ queryKey: ['rsvps', 'attendees', eventId] });

            // 3. Close Modal
            setPaymentModalOpen(false);
            setRegistrationAnswers({}); // Clear answers after success

        } catch (error) {
            console.error('RSVP Fulfillment failed:', error);
            alert('Payment confirmed but ticket issuance failed. Contact support.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleCancelRSVP = () => {
        if (!user) return;
        if (!isFree) {
            if (!confirm('Cancelling a paid ticket will NOT automatically refund your crypto. Contact support for refunds. Continue?')) return;
        }
        cancelRsvp({ eventId, userId: user!.uid });
    };

    const actionLoading = isRsvping || isCanceling || isVerifying;

    if (loading && !userRsvp) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
        );
    }

    // If registration form is open, show it exclusively
    if (isRegistrationOpen) {
        return (
            <RegistrationForm
                questions={effectiveQuestions}
                initialAnswers={{
                    'full_name': user?.displayName || ''
                }}
                onSubmit={handleRegistrationSubmit}
                onCancel={() => setRegistrationOpen(false)}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
                {rsvpStatus ? (
                    <div className="flex items-center gap-3 w-full">
                        {/* Check if pending approval (guestStatus will be on the userRsvp object) */}
                        {(userRsvp as any)?.guestStatus === 'pending_approval' ? (
                            <>
                                <Button
                                    fullWidth
                                    variant="primary"
                                    size="lg"
                                    className="gap-2 bg-amber-500/20 border-amber-500/30 text-amber-400"
                                    disabled
                                >
                                    <Clock className="w-5 h-5" />
                                    Awaiting Host Approval
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    onClick={handleCancelRSVP}
                                    disabled={actionLoading}
                                    className="shrink-0"
                                    title="Cancel Request"
                                >
                                    {actionLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <X className="w-5 h-5" />
                                    )}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    fullWidth
                                    variant="primary"
                                    size="lg"
                                    className="gap-2 bg-green-500/20 border-green-500/30 text-green-400"
                                    disabled
                                >
                                    <Check className="w-5 h-5" />
                                    {rsvpStatus === 'going' ? (!isFree ? "Ticket Purchased!" : "You're Going!") : "You're Interested"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    onClick={handleCancelRSVP}
                                    disabled={actionLoading}
                                    className="shrink-0"
                                >
                                    {actionLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <X className="w-5 h-5" />
                                    )}
                                </Button>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        <Button
                            fullWidth
                            variant="primary"
                            size="lg"
                            onClick={() => handleRegisterClick('going')}
                            disabled={actionLoading || !user}
                            className={!isFree ? "gap-2 bg-linear-to-r from-indigo-500 to-purple-600 border-none text-white shadow-lg shadow-purple-500/20" : "gap-2"}
                        >
                            {actionLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : !isFree ? (
                                <span className="font-bold flex items-center gap-2">
                                    Buy Ticket • {price} USD
                                </span>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    {requireApproval ? 'Request to Join' : 'Register'}
                                </>
                            )}
                        </Button>

                        <Button
                            fullWidth
                            variant="secondary"
                            size="lg"
                            onClick={() => handleRegisterClick('interested')}
                            disabled={actionLoading || !user}
                            className="gap-2"
                        >
                            <Bell className="w-5 h-5" />
                            I'm Interested
                        </Button>
                    </>
                )}
            </div>

            {/* Attendees Preview */}
            {attendees.length > 0 && (
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        {attendees.slice(0, 5).map((attendee, idx) => (
                            <motion.div
                                key={attendee.userId}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="relative"
                            >
                                {attendee.photoURL ? (
                                    <Image
                                        src={attendee.photoURL}
                                        alt={attendee.displayName}
                                        width={32}
                                        height={32}
                                        className="rounded-full border-2 border-bg-primary"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-accent/20 border-2 border-bg-primary flex items-center justify-center text-xs font-bold text-accent">
                                        {attendee.displayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                    <span className="text-sm text-text-secondary">
                        <Users className="w-4 h-4 inline mr-1" />
                        {attendees.length} {attendees.length === 1 ? 'person' : 'people'} attending
                    </span>
                </div>
            )}

            {!user && (
                <p className="text-sm text-text-muted text-center">
                    Please sign in to register
                </p>
            )}

            {/* Crypto Payment Modal */}
            <CryptoPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                solAmount={solAmount}
                ethAmount={ethAmount}
                onSuccess={handlePaymentSuccess}
            />
        </div>
    );
}
