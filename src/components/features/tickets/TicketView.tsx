/**
 * TicketView Component
 * Displays user's ticket with QR code for an event
 */

'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { Ticket, Check, Clock, XCircle, Download } from 'lucide-react';
import { GlossyCard } from '@/components/components/ui';
import { Guest } from '@/types/commerce';

interface TicketViewProps {
    guest: Guest;
    eventTitle: string;
    eventDate: string;
    eventLocation?: string;
}

const statusConfig = {
    pending: {
        icon: Clock,
        label: 'Pending',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
    },
    pending_approval: {
        icon: Clock,
        label: 'Awaiting Approval',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        borderColor: 'border-amber-500/30',
    },
    approved: {
        icon: Check,
        label: 'Approved',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
    },
    issued: {
        icon: Ticket,
        label: 'Valid Ticket',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
    },
    scanned: {
        icon: Check,
        label: 'Checked In',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
    },
    revoked: {
        icon: XCircle,
        label: 'Revoked',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
    },
    rejected: {
        icon: XCircle,
        label: 'Rejected',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
    },
};

export default function TicketView({ guest, eventTitle, eventDate, eventLocation }: TicketViewProps) {
    const [mounted, setMounted] = useState(false);
    const status = statusConfig[guest.status] || statusConfig.issued;
    const StatusIcon = status.icon;

    useEffect(() => {
        setMounted(true);
    }, []);

    // Generate QR content (the token that will be scanned)
    const qrContent = guest.qrToken;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
        >
            <GlossyCard className="overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center">
                    <h2 className="text-xl font-bold text-white mb-1">{eventTitle}</h2>
                    <p className="text-white/80 text-sm">{eventDate}</p>
                    {eventLocation && (
                        <p className="text-white/60 text-xs mt-1">{eventLocation}</p>
                    )}
                </div>

                {/* QR Code Section */}
                <div className="p-8 flex flex-col items-center">
                    {mounted && guest.status === 'issued' ? (
                        <div className="bg-white p-4 rounded-2xl shadow-lg">
                            {qrContent ? (
                                <QRCodeSVG
                                    value={qrContent}
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                />
                            ) : (
                                <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 rounded-lg">
                                    <p className="text-red-500 text-xs text-center font-medium">
                                        QR Token Missing<br />Contact Support
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : mounted && guest.status === 'pending' ? (
                        <div className="w-[200px] h-[200px] bg-yellow-500/10 border-2 border-dashed border-yellow-500/30 rounded-2xl flex items-center justify-center">
                            <div className="text-center p-4">
                                <Clock className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                                <p className="text-yellow-400 text-sm font-medium">Payment Pending</p>
                                <p className="text-text-muted text-xs mt-1">QR will appear after confirmation</p>
                            </div>
                        </div>
                    ) : mounted ? (
                        <div className="w-[200px] h-[200px] bg-blue-500/10 border-2 border-blue-500/30 rounded-2xl flex items-center justify-center">
                            <div className="text-center p-4">
                                <Check className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                                <p className="text-blue-400 text-sm font-medium">Already Checked In</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-[200px] h-[200px] bg-white/5 rounded-2xl animate-pulse" />
                    )}

                    {/* Status Badge */}
                    <div className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-full ${status.bgColor} border ${status.borderColor}`}>
                        <StatusIcon className={`w-4 h-4 ${status.color}`} />
                        <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                    </div>

                    {/* Ticket ID */}
                    <p className="mt-4 text-xs text-text-muted font-mono">
                        Ticket #{guest.id.slice(0, 8).toUpperCase()}
                    </p>
                </div>

                {/* Footer Instructions */}
                <div className="border-t border-white/5 p-4 bg-white/2">
                    <p className="text-center text-xs text-text-muted">
                        {guest.status === 'issued'
                            ? 'Show this QR code at the entrance'
                            : guest.status === 'pending'
                                ? 'Complete payment to receive your ticket'
                                : 'You have already checked in'}
                    </p>
                </div>
            </GlossyCard>
        </motion.div>
    );
}
