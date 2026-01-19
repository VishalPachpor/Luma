/**
 * Ticket Page
 * Client-side ticket display with Firebase Auth
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import * as guestRepo from '@/lib/repositories/guest.repository';
import TicketView from '@/components/features/tickets/TicketView';
import { Guest } from '@/types/commerce';
import { Loader2 } from 'lucide-react';

interface EventInfo {
    title: string;
    date: string;
    location: string;
}

export default function TicketPage() {
    const params = useParams();
    const router = useRouter();
    const { user, session, loading: authLoading } = useAuth();
    const eventId = params?.id as string;

    const [guest, setGuest] = useState<Guest | null>(null);
    const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchTicket() {
            if (!user?.uid || !eventId) return;

            try {
                setLoading(true);

                // Get Auth Token - prefer session token directly
                // console.log('[TicketPage] Fetching token...');
                const token = session?.access_token || await user.getIdToken();
                // console.log('[TicketPage] Token length:', token?.length);

                if (!token) {
                    console.error('[TicketPage] No token available!');
                    setError('Authentication failed. Please log in again.');
                    setLoading(false);
                    return;
                }

                // Fetch guest record via API (Server-side verification)
                // This avoids client-side RLS/Session issues
                const ticketResponse = await fetch(`/api/events/${eventId}/ticket`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (ticketResponse.status === 404) {
                    setError('No ticket found for this event');
                    return;
                }

                if (!ticketResponse.ok) {
                    throw new Error('Failed to load ticket');
                }

                const guestData = await ticketResponse.json();
                setGuest(guestData);

                // Fetch event info (basic details)
                const response = await fetch(`/api/events/${eventId}`);
                if (response.ok) {
                    const event = await response.json();
                    setEventInfo({
                        title: event.title || 'Event',
                        date: event.date || '',
                        location: event.location || '',
                    });
                }
            } catch (err: any) {
                console.error('Failed to fetch ticket:', err);
                setError(err.message || 'Failed to load ticket');
            } finally {
                setLoading(false);
            }
        }

        if (!authLoading) {
            if (!user) {
                router.push(`/events/${eventId}?error=login_required`);
            } else {
                fetchTicket();
            }
        }
        // Use user.uid instead of user object to prevent infinite loops
        // The useAuth hook returns a new user object reference on every render
    }, [user?.uid, authLoading, eventId, router]);

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push(`/events/${eventId}`)}
                        className="text-indigo-400 hover:text-indigo-300"
                    >
                        Back to Event
                    </button>
                </div>
            </div>
        );
    }

    // No ticket
    if (!guest || !eventInfo) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-text-muted mb-4">No ticket found</p>
                    <button
                        onClick={() => router.push(`/events/${eventId}`)}
                        className="text-indigo-400 hover:text-indigo-300"
                    >
                        Back to Event
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary py-8 px-4">
            <div className="max-w-lg mx-auto">
                <TicketView
                    guest={guest}
                    eventTitle={eventInfo.title}
                    eventDate={eventInfo.date}
                    eventLocation={eventInfo.location}
                />
            </div>
        </div>
    );
}
