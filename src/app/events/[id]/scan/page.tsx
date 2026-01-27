/**
 * Scan Page
 * Host-only page for scanning attendee tickets
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, QrCode } from 'lucide-react';
import { Button, GlossyCard } from '@/components/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useEvent } from '@/hooks/useEvents';
import QRScanner from '@/components/features/tickets/QRScanner';

export default function ScanPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const eventId = params.id as string;

    const { data: event, isLoading: eventLoading } = useEvent(eventId);
    const [checkedInCount, setCheckedInCount] = useState(0);

    // Check if user is host - handle both possible field names
    const organizerId = event?.organizerId || (event as any)?.organizer_id;
    const isHost = !!organizerId && organizerId === user?.uid;

    // Debug logging
    console.log('[ScanPage] Auth check:', {
        userUid: user?.uid,
        organizerId,
        eventOrganizerId: event?.organizerId,
        isHost
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push(`/events/${eventId}`);
        }
    }, [authLoading, user, router, eventId]);

    if (authLoading || eventLoading) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="animate-pulse text-text-muted">Loading...</div>
            </div>
        );
    }

    if (!isHost) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
                <GlossyCard className="p-8 text-center max-w-md">
                    <QrCode className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-text-primary mb-2">Access Denied</h2>
                    <p className="text-text-muted mb-6">Only event hosts can access the ticket scanner.</p>
                    <Button onClick={() => router.push(`/events/${eventId}`)} variant="secondary">
                        Back to Event
                    </Button>
                </GlossyCard>
            </div>
        );
    }

    const handleScanSuccess = () => {
        setCheckedInCount(prev => prev + 1);
    };

    return (
        <div className="min-h-screen bg-bg-primary">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/events/${eventId}`)}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="font-bold text-text-primary truncate">{event?.title}</h1>
                        <p className="text-xs text-text-muted">Ticket Scanner</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded-full">
                        <Users className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-medium">{checkedInCount}</span>
                    </div>
                </div>
            </header>

            {/* Scanner */}
            <main className="max-w-2xl mx-auto px-4 py-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <QRScanner
                        eventId={eventId}
                        onScanSuccess={handleScanSuccess}
                    />
                </motion.div>

                {/* Instructions */}
                <GlossyCard className="mt-6 p-4">
                    <h3 className="font-medium text-text-primary mb-2">Instructions</h3>
                    <ul className="text-sm text-text-muted space-y-1">
                        <li>• Point camera at attendee&apos;s QR code</li>
                        <li>• Green flash = successful check-in</li>
                        <li>• Blue flash = already checked in</li>
                        <li>• Red flash = invalid ticket</li>
                    </ul>
                </GlossyCard>
            </main>
        </div>
    );
}
