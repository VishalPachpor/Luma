/**
 * Event RSVP Component
 * Allows users to register/unregister for events
 * Supports Free RSVP (Write-heavy) and Paid Tickets (Crypto)
 */

'use client';

import { useState, useMemo } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
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
import TicketView from '@/components/features/tickets/TicketView';
import { useRouter } from 'next/navigation';
import { RegistrationQuestion } from '@/types/event';
import { Guest } from '@/types/commerce';
import { toast } from 'sonner';

interface EventRSVPProps {
    eventId: string;
    eventTitle: string;
    price?: number;
    registrationQuestions?: RegistrationQuestion[];
    requireApproval?: boolean;
    theme?: 'default' | 'luma';
    // Staking props
    requireStake?: boolean;
    stakeAmount?: number;
    organizerWallet?: string;
    eventStartTime?: number;
}

export default function EventRSVP({
    eventId,
    eventTitle,
    price = 0,
    registrationQuestions,
    requireApproval = false,
    theme = 'default',
    // Staking props
    requireStake = false,
    stakeAmount,
    organizerWallet,
    eventStartTime
}: EventRSVPProps) {
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

    // Fetch user's ticket when they have RSVP'd
    const { data: userTicket } = useQuery<Guest | null>({
        queryKey: ['ticket', eventId, user?.uid],
        queryFn: async () => {
            if (!user?.uid) return null;
            const token = await user.getIdToken();
            const res = await fetch(`/api/events/${eventId}/ticket`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!user?.uid && !!userRsvp?.status,
        staleTime: 30 * 1000, // 30 seconds
    });

    // React Query Mutations (Actions)
    const { mutate: rsvp, isPending: isRsvping } = useRSVPToEvent();
    const { mutate: cancelRsvp, isPending: isCanceling } = useCancelRSVP();

    const rsvpStatus = userRsvp?.status || null;
    const loading = rsvpLoading || attendeesLoading;
    const isFree = !price || price === 0;

    // Use USDC as primary payment (1:1 with USD - stablecoin)
    // No exchange rate calculation needed - $2.00 USD = 2.00 USDC
    const usdcAmount = price > 0 ? Number(price.toFixed(2)) : 0;

    // Optional: Fetch exchange rates for SOL/ETH if users want alternative payment methods
    const { data: exchangeRates } = useQuery({
        queryKey: ['exchange-rates'],
        queryFn: async () => {
            const res = await fetch('/api/payments/exchange-rates');
            if (!res.ok) throw new Error('Failed to fetch exchange rates');
            const data = await res.json();
            return data.rates as { sol: number; eth: number; usdc: number };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
        retry: 2,
        // Fallback rates if API fails
        placeholderData: { sol: 200, eth: 3000, usdc: 1.0 },
        enabled: false // Disabled by default - only fetch if user wants SOL/ETH options
    });

    // Calculate SOL/ETH amounts only if exchange rates are available (optional alternatives)
    const { solAmount, ethAmount } = useMemo(() => {
        if (!price || price === 0 || !exchangeRates) {
            return { solAmount: 0, ethAmount: 0 };
        }

        // Convert USD to crypto: USD price / crypto price in USD
        const sol = price / exchangeRates.sol;
        const eth = price / exchangeRates.eth;

        return {
            solAmount: Number(sol.toFixed(4)), // 4 decimal places for SOL
            ethAmount: Number(eth.toFixed(6))  // 6 decimal places for ETH
        };
    }, [price, exchangeRates]);

    // Only use actual questions provided by the event (no default questions)
    // Defensive check: ensure registrationQuestions is an array and filter out any invalid entries
    const validQuestions = Array.isArray(registrationQuestions)
        ? registrationQuestions.filter(q => q && q.id && q.label && q.type)
        : [];
    const hasQuestions = validQuestions.length > 0;
    const effectiveQuestions: RegistrationQuestion[] = validQuestions;

    // Auto-populate registration answers from user account (like Luma)
    // This happens automatically when user clicks register and there are no questions
    const getAutoPopulatedAnswers = useMemo(() => {
        if (!user) return {};

        const answers: Record<string, string | string[]> = {};

        // Auto-populate name and email from user account
        if (user.displayName) {
            answers['full_name'] = user.displayName;
        }
        if (user.email) {
            answers['email'] = user.email;
        }

        return answers;
    }, [user]);

    // Actions
    const handleRegisterClick = (status: RSVPStatus) => {
        if (!user) {
            // Redirect to login page instead of showing alert
            router.push(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
            return;
        }

        // CRITICAL: Only show registration form if event has ACTUAL custom questions
        // If no questions exist, skip form entirely and use auto-populated data
        if (status === 'going' && hasQuestions && Object.keys(registrationAnswers).length === 0) {
            // Pre-populate form with user's account data
            setRegistrationAnswers(getAutoPopulatedAnswers);
            setRegistrationOpen(true);
            return;
        }

        // If no questions, use auto-populated answers and proceed directly (like Luma)
        if (status === 'going' && !hasQuestions) {
            // Auto-populate from account and proceed immediately
            const autoAnswers = getAutoPopulatedAnswers;
            setRegistrationAnswers(autoAnswers);

            // Ensure form is closed if it was somehow open
            setRegistrationOpen(false);

            if (!isFree) {
                // Paid flow -> Open Payment Modal with auto-populated answers
                setPaymentModalOpen(true);
            } else {
                // Free flow -> Direct RSVP with auto-populated answers
                performRSVP(status, autoAnswers);
            }
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
        // Merge with auto-populated data to ensure name/email are always included
        const mergedAnswers = {
            ...getAutoPopulatedAnswers,
            ...answers
        };

        setRegistrationAnswers(mergedAnswers);
        setRegistrationOpen(false);

        // Continue with flow
        if (!isFree) {
            setPaymentModalOpen(true);
        } else {
            performRSVP('going', mergedAnswers);
        }
    };

    const performRSVP = async (status: RSVPStatus, answers?: Record<string, string | string[]>) => {
        if (!user) return;

        // Prevent direct registration for paid events (must go through payment flow)
        if (!isFree && status === 'going') {
            console.error('[EventRSVP] Cannot register for paid event without payment');
            toast.warning('Payment required. Please complete payment to register.');
            return;
        }

        // Use new Server Action for Dual-Write
        // Pass requireApproval to determine initial guest status
        try {
            // Call server action via dynamic import
            const result = await import('@/actions/event.actions').then(mod =>
                mod.registerForEvent(eventId, user.uid, requireApproval, answers)
            );

            if (result.success) {
                // Invalidate queries to refresh UI
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['rsvps', 'user', eventId, user.uid] }),
                    queryClient.invalidateQueries({ queryKey: ['rsvps', 'attendees', eventId] }),
                    queryClient.refetchQueries({ queryKey: ['rsvps', 'user', eventId, user.uid] }),
                ]);
                setRegistrationOpen(false); // Close modal if open
            } else {
                console.error('RSVP failed:', result.error);
                toast.error(result.error || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('RSVP error:', error);
            toast.error('An unexpected error occurred');
        }
    };

    const handlePaymentSuccess = async (data: { signature: string; chain: 'solana' | 'ethereum' | 'usdc-solana' | 'usdc-ethereum'; token?: 'usdc' | 'sol' | 'eth' }) => {
        setIsVerifying(true);

        try {
            const { signature, chain, token } = data;
            // USDC is 1:1 with USD, so use price directly
            // For USDC, the amount is the same as USD price
            const amountPaid = token === 'usdc' ? usdcAmount : (chain === 'solana' ? solAmount : ethAmount);
            // Map chain types to API format
            // 'usdc-ethereum' -> 'ethereum', 'usdc-solana' -> 'solana'
            const apiChain = chain === 'usdc-ethereum' ? 'ethereum' : chain === 'usdc-solana' ? 'solana' : chain;

            // 1. Call Verification API to fulfill order
            const res = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reference: signature,
                    eventId,
                    userId: user!.uid,
                    amount: amountPaid,
                    chain: apiChain,
                    token: token || (chain === 'solana' ? 'sol' : 'eth'), // Pass token type
                    answers: registrationAnswers // Pass answers to verification API
                })
            });

            const resData = await res.json();

            if (!res.ok) throw new Error(resData.error || 'Verification failed');

            // 2. Invalidate ALL related queries to force refresh
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['rsvps', 'user', eventId, user!.uid] }),
                queryClient.invalidateQueries({ queryKey: ['rsvps', 'attendees', eventId] }),
                queryClient.invalidateQueries({ queryKey: ['rsvps'] }), // Invalidate all RSVP queries
                queryClient.invalidateQueries({ queryKey: ['ticket', eventId, user!.uid] }), // Invalidate ticket query to fetch new QR
                queryClient.refetchQueries({ queryKey: ['rsvps', 'user', eventId, user!.uid] }), // Force refetch
            ]);

            // 3. Close Modal
            setPaymentModalOpen(false);
            setRegistrationAnswers({}); // Clear answers after success

            // 4. Show success message
            console.log('[EventRSVP] Payment verified and ticket issued successfully');

        } catch (error) {
            console.error('RSVP Fulfillment failed:', error);
            toast.error('Payment confirmed but ticket issuance failed. Contact support.');
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
    // BUT: Only show form if there are actual questions to answer
    // If form is open but no questions exist, close it and proceed with auto-populated data
    if (isRegistrationOpen) {
        // Safety check: if no questions, close form and proceed
        if (!hasQuestions || effectiveQuestions.length === 0) {
            // Close form and proceed with auto-populated answers
            setRegistrationOpen(false);
            const autoAnswers = getAutoPopulatedAnswers;
            setRegistrationAnswers(autoAnswers);

            if (!isFree) {
                setPaymentModalOpen(true);
            } else {
                performRSVP('going', autoAnswers);
            }
            return null; // Return null while processing
        }

        return (
            <RegistrationForm
                questions={effectiveQuestions}
                initialAnswers={{
                    ...getAutoPopulatedAnswers,
                    ...registrationAnswers // Preserve any answers already entered
                }}
                onSubmit={handleRegistrationSubmit}
                onCancel={() => setRegistrationOpen(false)}
            />
        );
    }

    // Luma Button Styles
    const registerBtnClass = theme === 'luma'
        ? "bg-white text-black hover:bg-white/90 border-none font-medium text-[14px] h-[44px] rounded-[10px]"
        : (!isFree
            ? "gap-2 bg-linear-to-r from-indigo-500 to-purple-600 border-none text-white shadow-lg shadow-purple-500/20"
            : "gap-2");

    const interestedBtnClass = theme === 'luma'
        ? "bg-white/10 text-white hover:bg-white/20 border-none font-medium text-[14px] h-[44px] rounded-[10px]"
        : "gap-2";

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
                            disabled={actionLoading}
                            className={registerBtnClass}
                        >
                            {actionLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : !isFree ? (
                                <span className="font-bold flex items-center gap-2">
                                    Buy Ticket • {price} USD
                                </span>
                            ) : (
                                <>
                                    {theme !== 'luma' && <UserPlus className="w-5 h-5 mr-2" />}
                                    {theme === 'luma' ? 'One-Click RSVP' : (requireApproval ? 'Request to Join' : 'Register')}
                                </>
                            )}
                        </Button>

                        {theme !== 'luma' && ( // Hide Interested button in Luma mode if strict, or style it? Luma typically just has "Register" or "Request". Let's keep it but styled.
                            <Button
                                fullWidth
                                variant="secondary"
                                size="lg"
                                onClick={() => handleRegisterClick('interested')}
                                disabled={actionLoading || !user}
                                className={interestedBtnClass}
                            >
                                <Bell className="w-4 h-4 mr-2" />
                                I'm Interested
                            </Button>
                        )}
                    </>
                )}
            </div>

            {/* User's Ticket (QR Code) */}
            {rsvpStatus === 'going' && userTicket && (
                <div className="mt-6">
                    <TicketView
                        guest={userTicket}
                        eventTitle={eventTitle}
                        eventDate="" // Will be passed from parent if needed
                    />
                </div>
            )}

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
                usdcAmount={usdcAmount}
                solAmount={solAmount}
                ethAmount={ethAmount}
                onSuccess={handlePaymentSuccess}
                // Staking mode props
                stakeMode={requireStake}
                stakeAmount={stakeAmount || 0}
                eventId={eventId}
                organizerWallet={organizerWallet}
                eventStartTime={eventStartTime}
            />
        </div>
    );
}
