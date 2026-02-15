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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="max-w-sm mx-auto"
        >
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-zinc-900/90 via-zinc-800/90 to-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl">
                {/* Decorative Background Elements */}
                <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl translate-y-32 -translate-x-32" />

                {/* Content Container */}
                <div className="relative z-10">
                    {/* Event Header */}
                    <div className="px-6 pt-8 pb-6 text-center">
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                                {eventTitle}
                            </h2>
                            <p className="text-sm text-zinc-400 font-medium">
                                {eventDate}
                            </p>
                            {eventLocation && (
                                <p className="text-xs text-zinc-500 mt-1.5">
                                    📍 {eventLocation}
                                </p>
                            )}
                        </motion.div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

                    {/* QR Code Section */}
                    <div className="px-6 py-8">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                            className="flex flex-col items-center"
                        >
                            {mounted && showQR ? (
                                <>
                                    {/* QR Code Container with Premium Frame */}
                                    <div className="relative">
                                        {/* Outer Glow */}
                                        <div className="absolute inset-0 bg-linear-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl" />

                                        {/* QR Card */}
                                        <div className="relative bg-white rounded-2xl p-6 shadow-2xl">
                                            {qrContent ? (
                                                <QRCodeSVG
                                                    value={qrContent}
                                                    size={220}
                                                    level="H"
                                                    includeMargin={false}
                                                />
                                            ) : (
                                                <div className="w-[220px] h-[220px] flex items-center justify-center bg-red-50 rounded-xl border-2 border-red-200">
                                                    <div className="text-center p-4">
                                                        <p className="text-red-600 text-sm font-bold mb-1">
                                                            QR Token Missing
                                                        </p>
                                                        <p className="text-red-500 text-xs">
                                                            Please contact support
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Corner Decorations */}
                                        <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-400/50 rounded-tl-lg" />
                                        <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-purple-400/50 rounded-tr-lg" />
                                        <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-purple-400/50 rounded-bl-lg" />
                                        <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-400/50 rounded-br-lg" />
                                    </div>

                                    {/* Status Badge - Below QR */}
                                    <motion.div
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className={`mt-6 flex items-center gap-2.5 px-5 py-2.5 rounded-full ${status.bgColor} border ${status.borderColor} shadow-lg`}
                                    >
                                        <StatusIcon className={`w-5 h-5 ${status.color}`} />
                                        <span className={`text-sm font-semibold ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </motion.div>

                                    {/* Instruction */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="mt-6 text-center"
                                    >
                                        <p className="text-white/70 text-sm font-medium">
                                            📱 Show this QR code at the entrance
                                        </p>
                                    </motion.div>
                                </>
                            ) : mounted && isPending ? (
                                <>
                                    {/* Pending State */}
                                    <div className="w-[220px] h-[220px] bg-linear-to-br from-yellow-500/10 to-amber-500/10 border-2 border-dashed border-yellow-500/30 rounded-3xl flex items-center justify-center relative overflow-hidden">
                                        {/* Animated Background */}
                                        <div className="absolute inset-0 bg-linear-to-br from-yellow-500/5 to-transparent animate-pulse" />

                                        <div className="text-center p-6 relative z-10">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                            >
                                                <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-3" />
                                            </motion.div>
                                            <p className="text-yellow-400 text-base font-bold mb-1">
                                                {guest.status === 'pending_approval' || guest.status === 'staked' ? 'Awaiting Approval' : 'Payment Pending'}
                                            </p>
                                            <p className="text-zinc-400 text-xs">
                                                QR code will appear after confirmation
                                            </p>
                                        </div>
                                    </div>

                                    <motion.div
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        className={`mt-6 flex items-center gap-2.5 px-5 py-2.5 rounded-full ${status.bgColor} border ${status.borderColor}`}
                                    >
                                        <StatusIcon className={`w-5 h-5 ${status.color}`} />
                                        <span className={`text-sm font-semibold ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </motion.div>
                                </>
                            ) : mounted && isCheckedIn ? (
                                <>
                                    {/* Checked In State */}
                                    <div className="w-[220px] h-[220px] bg-linear-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 rounded-3xl flex items-center justify-center">
                                        <div className="text-center p-6">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                                            >
                                                <Check className="w-20 h-20 text-blue-400 mx-auto mb-3" />
                                            </motion.div>
                                            <p className="text-blue-400 text-base font-bold">
                                                Already Checked In
                                            </p>
                                            <p className="text-zinc-400 text-xs mt-1">
                                                Enjoy the event!
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`mt-6 flex items-center gap-2.5 px-5 py-2.5 rounded-full ${status.bgColor} border ${status.borderColor}`}>
                                        <StatusIcon className={`w-5 h-5 ${status.color}`} />
                                        <span className={`text-sm font-semibold ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                </>
                            ) : mounted && isTerminal ? (
                                <>
                                    {/* Terminal State (Rejected, Revoked, etc.) */}
                                    <div className={`w-[220px] h-[220px] ${status.bgColor} border-2 ${status.borderColor} rounded-3xl flex items-center justify-center`}>
                                        <div className="text-center p-6">
                                            <StatusIcon className={`w-20 h-20 ${status.color} mx-auto mb-3`} />
                                            <p className={`${status.color} text-base font-bold`}>
                                                {status.label}
                                            </p>
                                            <p className="text-zinc-400 text-xs mt-1">
                                                Contact organizer if needed
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`mt-6 flex items-center gap-2.5 px-5 py-2.5 rounded-full ${status.bgColor} border ${status.borderColor}`}>
                                        <StatusIcon className={`w-5 h-5 ${status.color}`} />
                                        <span className={`text-sm font-semibold ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="w-[220px] h-[220px] bg-white/5 rounded-3xl animate-pulse" />
                            )}
                        </motion.div>
                    </div>

                    {/* Ticket Footer */}
                    <div className="border-t border-white/5 bg-white/2 px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                            <Ticket className="w-3.5 h-3.5 text-zinc-500" />
                            <p className="text-xs text-zinc-500 font-mono">
                                #{guest.id.slice(0, 8).toUpperCase()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
