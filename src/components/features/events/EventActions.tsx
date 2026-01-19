/**
 * Event Actions Component
 * Client-side wrapper for RSVP and Invite functionality on event detail page
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Modal from '@/components/modals/Modal';
import { Share2, Loader2, AlertTriangle, Ticket, QrCode, Users } from 'lucide-react';
import { Button } from '@/components/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import EventRSVP from './EventRSVP';
import InviteSender from './InviteSender';
import AddToCalendar from './AddToCalendar';
import { useUserRSVP } from '@/hooks/useRSVP';
import { RegistrationQuestion } from '@/types/event';

interface EventActionsProps {
    eventId: string;
    eventTitle: string;
    eventDescription?: string;
    eventLocation?: string;
    eventDate?: string;
    organizer: string;
    organizerId?: string;
    price?: number;
    registrationQuestions?: RegistrationQuestion[];
    requireApproval?: boolean;
}

export default function EventActions({
    eventId,
    eventTitle,
    eventDescription = '',
    eventLocation = '',
    eventDate = '',
    organizer,
    organizerId,
    price = 0,
    registrationQuestions = [],
    requireApproval = false
}: EventActionsProps) {
    const { user, loading: authLoading } = useAuth();
    // Use React Query hook for instant cache check and automatic background refetching
    const { data: userRsvp, isLoading: rsvpLoading } = useUserRSVP(eventId, user?.uid);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Derived state from React Query data
    const rsvpStatus = userRsvp?.status || null;
    const checking = rsvpLoading;

    // Check if current user is the organizer
    const isOrganizer = user && organizerId && user.uid === organizerId;

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Error ${res.status}`);
            }

            // Redirect to home
            window.location.href = '/';
        } catch (error: any) {
            console.error('Delete error:', error);
            alert(`Failed to delete event: ${error.message}`);
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    return (
        <>
            <div className="bg-[#151A29] rounded-2xl border border-indigo-500/20 shadow-2xl shadow-indigo-500/5 hover-card relative z-10 transition-all p-6 space-y-6">
                {/* RSVP / Registration Section - Only for non-organizers */}
                {!isOrganizer && (
                    <EventRSVP
                        eventId={eventId}
                        eventTitle={eventTitle}
                        price={price}
                        registrationQuestions={registrationQuestions}
                        requireApproval={requireApproval}
                    />
                )}

                {/* Ticket Actions: View Ticket (for registered users) and Scan (for hosts) */}
                {rsvpStatus === 'going' && (
                    <div className="pt-4 border-t border-white/5">
                        <a href={`/events/${eventId}/ticket`}>
                            <Button
                                variant="secondary"
                                className="w-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20 gap-2"
                            >
                                <Ticket className="w-4 h-4" />
                                View Ticket
                            </Button>
                        </a>
                    </div>
                )}

                {/* Scan Tickets Button - Host Only */}
                {isOrganizer && (
                    <div className="pt-4 border-t border-white/5 space-y-2">
                        {/* Manage Event Button */}
                        <a href={`/events/${eventId}/manage`}>
                            <Button
                                variant="secondary"
                                className="w-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20 gap-2"
                            >
                                <Users className="w-4 h-4" />
                                Manage Guests
                            </Button>
                        </a>

                        {/* Scan Tickets */}
                        <a href={`/events/${eventId}/scan`}>
                            <Button
                                variant="secondary"
                                className="w-full bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20 gap-2"
                            >
                                <QrCode className="w-4 h-4" />
                                Scan Tickets
                            </Button>
                        </a>
                    </div>
                )}

                {/* Edit Event Button - Organizer Only */}
                {isOrganizer && (
                    <div className="pt-4 border-t border-white/5 space-y-2">
                        <a href={`/events/${eventId}/edit`}>
                            <Button
                                variant="secondary"
                                className="w-full bg-white/5 text-white hover:bg-white/10 border-white/10 gap-2"
                            >
                                <Users className="w-4 h-4" />
                                Edit Event
                            </Button>
                        </a>
                    </div>
                )}

                {/* Delete Event Button - Organizer Only */}
                {isOrganizer && (
                    <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
                        <p className="text-xs text-center text-text-muted">You are the organizer of this event</p>
                        <Button
                            variant="secondary"
                            className="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
                            onClick={() => setShowDeleteModal(true)}
                            disabled={isDeleting}
                        >
                            Delete Event
                        </Button>
                    </div>
                )}
            </div>

            {/* Custom Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Event"
                maxWidth="max-w-md"
            >
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <div className="p-3 bg-red-500/20 rounded-full shrink-0">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="text-sm text-red-200">
                            <p className="font-bold text-red-400 mb-1">Warning: Irreversible Action</p>
                            Are you sure you want to delete this event? This action cannot be undone and will remove all event data.
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="secondary"
                            onClick={() => setShowDeleteModal(false)}
                            className="flex-1"
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleDelete}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white border-none"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Deleting...
                                </span>
                            ) : 'Yes, Delete'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
