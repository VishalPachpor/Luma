/**
 * Chat List Panel
 * Shows list of all event chats user is part of (Luma-style sidebar)
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/AuthContext';

interface ChatPreview {
    eventId: string;
    eventTitle: string;
    eventImage?: string;
    lastMessage?: string;
    lastMessageAt?: string;
}

interface ChatListPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectChat: (eventId: string, eventTitle: string, eventImage?: string) => void;
}

export default function ChatListPanel({ isOpen, onClose, onSelectChat }: ChatListPanelProps) {
    const { user } = useAuth();
    const [chats, setChats] = useState<ChatPreview[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load user's event chats
    useEffect(() => {
        if (!isOpen) return;

        // If user is not present but panel is open, we should stop loading or show error?
        // But ChatFloatingButton only renders this if user exists. 
        if (!user) {
            setIsLoading(false);
            return;
        }

        const loadChats = async () => {
            // console.log('[ChatListPanel] Loading chats...');
            setIsLoading(true);
            try {
                const browserClient = createSupabaseBrowserClient();

                // Fetch as Guest AND Host in parallel
                const [guestRes, hostRes] = await Promise.all([
                    browserClient
                        .from('guests')
                        .select('event_id')
                        .eq('user_id', user.uid)
                        .in('status', ['approved', 'issued', 'scanned', 'checked_in']),
                    browserClient
                        .from('events')
                        .select('id')
                        .eq('organizer_id', user.uid)
                ]);

                if (guestRes.error) {
                    console.error('[ChatListPanel] Guest fetch error:', guestRes.error);
                }
                if (hostRes.error) {
                    console.error('[ChatListPanel] Host fetch error:', hostRes.error);
                }

                const guestEventIds = guestRes.data?.map(r => r.event_id) || [];
                const hostEventIds = hostRes.data?.map(e => e.id) || [];

                // Combine and deduplicate
                const allEventIds = Array.from(new Set([...guestEventIds, ...hostEventIds]));

                if (allEventIds.length === 0) {
                    setChats([]);
                    return;
                }

                // Get event details
                const { data: events, error: eventsError } = await browserClient
                    .from('events')
                    .select('id, title, cover_image')
                    .in('id', allEventIds);

                if (eventsError) throw eventsError;

                // Get last message for each event
                const chatPreviews: ChatPreview[] = [];

                for (const event of events || []) {
                    const { data: lastMsg } = await browserClient
                        .from('chat_messages')
                        .select('content, created_at')
                        .eq('event_id', event.id)
                        .is('deleted_at', null)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    chatPreviews.push({
                        eventId: event.id,
                        eventTitle: event.title,
                        eventImage: event.cover_image || undefined,
                        lastMessage: lastMsg?.content,
                        lastMessageAt: lastMsg?.created_at,
                    });
                }

                // Sort by last message time
                chatPreviews.sort((a, b) => {
                    if (!a.lastMessageAt) return 1;
                    if (!b.lastMessageAt) return -1;
                    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
                });

                // console.log('[ChatListPanel] Chats loaded', chatPreviews.length);
                setChats(chatPreviews);
            } catch (error) {
                console.error('[ChatListPanel] Load chats error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadChats();
    }, [isOpen, user?.uid]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="fixed bottom-4 right-4 w-[320px] bg-bg-primary rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-50"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">Chats</span>
                            <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4 text-text-muted" />
                        </button>
                    </div>

                    {/* Chat List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            </div>
                        ) : chats.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <MessageCircle className="w-10 h-10 text-text-muted mx-auto mb-3" />
                                <p className="text-sm text-text-muted">
                                    No chats yet. Register for events to join their discussions.
                                </p>
                            </div>
                        ) : (
                            chats.map((chat) => (
                                <button
                                    key={chat.eventId}
                                    onClick={() => onSelectChat(chat.eventId, chat.eventTitle, chat.eventImage)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                                >
                                    {/* Event Image */}
                                    <div className="shrink-0">
                                        {chat.eventImage ? (
                                            <Image
                                                src={chat.eventImage}
                                                alt={chat.eventTitle}
                                                width={44}
                                                height={44}
                                                className="rounded-xl object-cover"
                                            />
                                        ) : (
                                            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                                <MessageCircle className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Chat Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="font-medium text-sm text-white truncate">
                                                {chat.eventTitle}
                                            </h4>
                                            {chat.lastMessageAt && (
                                                <span className="text-xs text-text-muted shrink-0">
                                                    {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: false })}
                                                </span>
                                            )}
                                        </div>
                                        {chat.lastMessage && (
                                            <p className="text-xs text-text-muted truncate mt-0.5">
                                                {chat.lastMessage}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
