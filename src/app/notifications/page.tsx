'use client';

import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Bell, Calendar, ChevronLeft, CheckCheck, MessageCircle, UserCheck, XCircle } from 'lucide-react';
import Header from '@/components/components/layout/Header';
import { motion } from 'framer-motion';

const notificationIcons: Record<Notification['type'], React.ElementType> = {
    approval_granted: UserCheck,
    approval_rejected: XCircle,
    event_reminder: Calendar,
    event_update: Calendar,
    new_message: MessageCircle,
    system: Bell,
};

const notificationColors: Record<Notification['type'], string> = {
    approval_granted: 'text-green-400 bg-green-500/20',
    approval_rejected: 'text-red-400 bg-red-500/20',
    event_reminder: 'text-blue-400 bg-blue-500/20',
    event_update: 'text-indigo-400 bg-indigo-500/20',
    new_message: 'text-purple-400 bg-purple-500/20',
    system: 'text-gray-400 bg-gray-500/20',
};

export default function NotificationsPage() {
    const {
        notifications,
        isLoading,
        markAllAsRead,
        markAsRead
    } = useNotifications();

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read_at) {
            markAsRead(notification.id);
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary text-text-secondary font-sans selection:bg-indigo-500/30">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Header />

                <div className="max-w-2xl mx-auto mt-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/"
                                className="p-2 hover:bg-white/5 rounded-full transition-colors text-text-muted hover:text-white"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Link>
                            <h1 className="text-2xl font-bold text-white">Notifications</h1>
                        </div>

                        {notifications.length > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors border border-indigo-500/20"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="bg-surface-1/50 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                        {isLoading ? (
                            <div className="p-12 text-center text-text-muted">
                                <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-indigo-500 animate-spin mx-auto mb-4" />
                                Loading notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                    <Bell className="w-8 h-8 text-white/20" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-1">No notifications</h3>
                                <p className="text-text-muted text-sm">You're all caught up! Check back later.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notification, index) => {
                                    const Icon = notificationIcons[notification.type];
                                    const colorClass = notificationColors[notification.type];
                                    const isUnread = !notification.read_at;

                                    const content = (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`group flex gap-4 p-5 hover:bg-white/2 cursor-pointer transition-all ${isUnread ? 'bg-white/2' : ''
                                                }`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            {/* Icon */}
                                            <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${colorClass.split(' ')[1]} group-hover:scale-110 transition-transform`}>
                                                <Icon className={`w-5 h-5 ${colorClass.split(' ')[0]}`} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 pt-1">
                                                <div className="flex justify-between items-start gap-4">
                                                    <p className={`text-base ${isUnread ? 'text-white font-semibold' : 'text-white/80'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-xs text-text-muted whitespace-nowrap shrink-0">
                                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>

                                                {notification.message && (
                                                    <p className="text-sm text-text-muted mt-1 leading-relaxed">
                                                        {notification.message}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Unread Indicator */}
                                            {isUnread && (
                                                <div className="shrink-0 self-center">
                                                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                                </div>
                                            )}
                                        </motion.div>
                                    );

                                    return notification.link ? (
                                        <Link key={notification.id} href={notification.link} className="block">
                                            {content}
                                        </Link>
                                    ) : (
                                        <div key={notification.id} className="block">
                                            {content}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
