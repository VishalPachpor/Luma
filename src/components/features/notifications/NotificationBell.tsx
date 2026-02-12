/**
 * NotificationBell Component
 * Header notification icon with unread badge and dropdown
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, ChevronRight, Calendar, MessageCircle, UserCheck, XCircle } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

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

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
    } = useNotifications();

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                panelRef.current &&
                buttonRef.current &&
                !panelRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read_at) {
            markAsRead(notification.id);
        }
        if (notification.link) {
            setIsOpen(false);
        }
    };

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-white/5 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5 text-white/70" />

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                )}
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-bg-secondary border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                            <h3 className="font-semibold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllAsRead()}
                                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {isLoading ? (
                                <div className="p-8 text-center text-text-muted">
                                    Loading...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell className="w-10 h-10 text-white/10 mx-auto mb-2" />
                                    <p className="text-text-muted text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notification) => {
                                    const Icon = notificationIcons[notification.type];
                                    const colorClass = notificationColors[notification.type];
                                    const isUnread = !notification.read_at;

                                    const content = (
                                        <div
                                            className={`flex gap-3 p-4 hover:bg-white/2 cursor-pointer transition-colors ${isUnread ? 'bg-white/2' : ''
                                                }`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            {/* Icon */}
                                            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass.split(' ')[1]}`}>
                                                <Icon className={`w-5 h-5 ${colorClass.split(' ')[0]}`} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${isUnread ? 'text-white font-medium' : 'text-white/80'}`}>
                                                    {notification.title}
                                                </p>
                                                {notification.message && (
                                                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                )}
                                                <p className="text-xs text-text-muted mt-1">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </p>
                                            </div>

                                            {/* Unread Indicator */}
                                            {isUnread && (
                                                <div className="shrink-0 w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                                            )}
                                        </div>
                                    );

                                    return notification.link ? (
                                        <Link key={notification.id} href={notification.link}>
                                            {content}
                                        </Link>
                                    ) : (
                                        <div key={notification.id}>{content}</div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="border-t border-white/5 p-2">
                                <Link
                                    href="/notifications"
                                    className="flex items-center justify-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 py-2 transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    View all notifications
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
