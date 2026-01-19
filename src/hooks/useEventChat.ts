/**
 * useEventChat Hook
 * Real-time chat subscription using Supabase Realtime
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';
import { useAuth } from '@/contexts/AuthContext';
import * as chatRepo from '@/lib/repositories/chat.repository';

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

interface UseEventChatOptions {
    eventId: string;
    enabled?: boolean;
}

interface UseEventChatReturn {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    sendMessage: (content: string, replyToId?: string) => Promise<boolean>;
    loadMore: () => Promise<void>;
    hasMore: boolean;
    participantCount: number;
}

export function useEventChat({ eventId, enabled = true }: UseEventChatOptions): UseEventChatReturn {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [participantCount, setParticipantCount] = useState(0);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // Load initial messages
    useEffect(() => {
        // console.log('[useEventChat] Effect triggered', { eventId, enabled });
        if (!enabled || !eventId) {
            // console.log('[useEventChat] Disabled or no EventId', { enabled, eventId });
            setIsLoading(false);
            return;
        }

        const loadMessages = async () => {
            // console.log('[useEventChat] Starting loadMessages...');
            setIsLoading(true);
            try {
                // Fetch messages and event details (for participant count) in parallel
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout loading messages')), 10000)
                );

                const [messagesResult, eventResult] = await Promise.all([
                    Promise.race([
                        chatRepo.getMessages(eventId, 50),
                        timeoutPromise
                    ]) as Promise<ChatMessage[]>,
                    // Fetch event stats for accurate participant count
                    supabase
                        .from('events')
                        .select('attendee_count')
                        .eq('id', eventId)
                        .single()
                ]);

                // console.log('[useEventChat] Messages loaded', messagesResult?.length);

                const data = messagesResult || [];

                setMessages(data);
                setHasMore(data.length >= 50);

                // Set participant count from event data, falling back to message participants
                if (eventResult.data) {
                    setParticipantCount(eventResult.data.attendee_count || 0);
                } else {
                    const uniqueUsers = new Set(data.map(m => m.user_id).filter(Boolean));
                    setParticipantCount(uniqueUsers.size || 1); // At least show 1 (you)
                }

            } catch (err) {
                console.error('[useEventChat] Failed to load chat/event data:', err);
                setError('Failed to load messages');
                setMessages([]);
            } finally {
                // console.log('[useEventChat] Finally: setting isLoading false');
                setIsLoading(false);
            }
        };

        loadMessages();
    }, [eventId, enabled]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!enabled || !eventId) return;

        const channel = supabase
            .channel(`chat:${eventId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `event_id=eq.${eventId}`,
                },
                (payload) => {
                    const newMessage = payload.new as ChatMessage;
                    setMessages((prev) => {
                        // Avoid duplicates
                        if (prev.some(m => m.id === newMessage.id)) return prev;
                        return [...prev, newMessage];
                    });

                    // Update participant count
                    if (newMessage.user_id) {
                        setParticipantCount(prev => {
                            const existing = messages.find(m => m.user_id === newMessage.user_id);
                            return existing ? prev : prev + 1;
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `event_id=eq.${eventId}`,
                },
                (payload) => {
                    const updatedMessage = payload.new as ChatMessage;
                    setMessages((prev) =>
                        prev.map(m => m.id === updatedMessage.id ? updatedMessage : m)
                    );
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
        };
    }, [eventId, enabled, messages]);

    // Send message
    const sendMessage = useCallback(async (content: string, replyToId?: string): Promise<boolean> => {
        if (!user || !content.trim()) return false;

        try {
            const token = await user.getIdToken();
            if (!token) throw new Error('No auth token');

            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    eventId,
                    content: content.trim(),
                    replyToId,
                }),
            });

            return response.ok;
        } catch (err) {
            console.error('[useEventChat] Send message failed:', err);
            return false;
        }
    }, [user, eventId]);

    // Load more messages (pagination)
    const loadMore = useCallback(async () => {
        if (!hasMore || messages.length === 0) return;

        const oldest = messages[0];
        const olderMessages = await chatRepo.getMessages(eventId, 50, oldest.created_at);

        if (olderMessages.length < 50) {
            setHasMore(false);
        }

        setMessages(prev => [...olderMessages, ...prev]);
    }, [eventId, hasMore, messages]);

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        loadMore,
        hasMore,
        participantCount,
    };
}
