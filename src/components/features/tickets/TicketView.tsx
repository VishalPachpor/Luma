/**
 * TicketView Component
 * Displays user's ticket with QR code for an event
 */

'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { Ticket, Check, Clock, XCircle, Download, Coins, RefreshCw, AlertTriangle } from 'lucide-react';
import { GlossyCard } from '@/components/components/ui';
import { Guest, GuestStatus } from '@/types/commerce';

interface TicketViewProps {
    guest: Guest;
    eventTitle: string;
    eventDate: string;
    eventLocation?: string;
}

// Status configuration for all guest statuses
const statusConfig: Record<GuestStatus, {
    icon: any;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
}> = {
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
    staked: {
        icon: Coins,
        label: 'Staked - Ready',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/30',
    },
    checked_in: {
        icon: Check,
        label: 'Checked In',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
    },
    scanned: {
        icon: Check,
        label: 'Checked In',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
    },
    refunded: {
        icon: RefreshCw,
        label: 'Refunded',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/30',
    },
    forfeited: {
        icon: AlertTriangle,
        label: 'Forfeited',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500/30',
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

    // Determine if QR should be shown
    // CRITICAL: Staked guests must be approved before they get QR access
    const showQR = guest.status === 'issued' || guest.status === 'approved';
    const isCheckedIn = guest.status === 'checked_in' || guest.status === 'scanned';
    const isPending = guest.status === 'pending' || guest.status === 'pending_approval' || guest.status === 'staked';
    const isTerminal = guest.status === 'rejected' || guest.status === 'revoked' ||
        guest.status === 'refunded' || guest.status === 'forfeited';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
        >
            <GlossyCard className="overflow-hidden">
                {/* Header */}
                <div className="bg-linear-to-r from-indigo-600 to-purple-600 p-6 text-center">
                    <h2 className="text-xl font-bold text-white mb-1">{eventTitle}</h2>
                    <p className="text-white/80 text-sm">{eventDate}</p>
                    {eventLocation && (
                        <p className="text-white/60 text-xs mt-1">{eventLocation}</p>
                    )}
                </div>

                {/* QR Code Section */}
                <div className="p-8 flex flex-col items-center">
                    {mounted && showQR ? (
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
                    ) : mounted && isPending ? (
                        <div className="w-[200px] h-[200px] bg-yellow-500/10 border-2 border-dashed border-yellow-500/30 rounded-2xl flex items-center justify-center">
                            <div className="text-center p-4">
                                <Clock className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                                <p className="text-yellow-400 text-sm font-medium">
                                    {guest.status === 'pending_approval' ? 'Awaiting Approval' : 'Payment Pending'}
                                </p>
                                <p className="text-text-muted text-xs mt-1">QR will appear after confirmation</p>
                            </div>
                        </div>
                    ) : mounted && isCheckedIn ? (
                        <div className="w-[200px] h-[200px] bg-blue-500/10 border-2 border-blue-500/30 rounded-2xl flex items-center justify-center">
                            <div className="text-center p-4">
                                <Check className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                                <p className="text-blue-400 text-sm font-medium">Already Checked In</p>
                            </div>
                        </div>
                    ) : mounted && isTerminal ? (
                        <div className={`w-[200px] h-[200px] ${status.bgColor} border-2 ${status.borderColor} rounded-2xl flex items-center justify-center`}>
                            <div className="text-center p-4">
                                <StatusIcon className={`w-12 h-12 ${status.color} mx-auto mb-2`} />
                                <p className={`${status.color} text-sm font-medium`}>{status.label}</p>
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
                        {showQR
                            ? 'Show this QR code at the entrance'
                            : isPending
                                ? guest.status === 'pending_approval'
                                    ? 'Waiting for organizer approval'
                                    : 'Complete payment to receive your ticket'
                                : isCheckedIn
                                    ? 'You have already checked in'
                                    : isTerminal
                                        ? `Ticket ${status.label.toLowerCase()}`
                                        : 'Contact the organizer for assistance'}
                    </p>
                </div>
            </GlossyCard>
        </motion.div>
    );
}
