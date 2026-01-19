/**
 * useNotifications Hook
 * Real-time notifications with Supabase subscriptions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as notificationRepo from '@/lib/repositories/notification.repository';

export interface Notification {
    id: string;
    user_id: string;
    type: 'approval_granted' | 'approval_rejected' | 'event_reminder' | 'event_update' | 'new_message' | 'system';
    title: string;
    message: string | null;
    link: string | null;
    metadata: Record<string, unknown>;
    read_at: string | null;
    created_at: string;
}

export const notificationKeys = {
    all: ['notifications'] as const,
    list: (userId: string) => [...notificationKeys.all, 'list', userId] as const,
    unreadCount: (userId: string) => [...notificationKeys.all, 'unread', userId] as const,
};

export function useNotifications() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isSubscribed, setIsSubscribed] = useState(false);

    // Fetch notifications
    const {
        data: notifications = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: notificationKeys.list(user?.uid || ''),
        queryFn: () => notificationRepo.getNotifications(user!.uid, 20),
        enabled: !!user?.uid,
        staleTime: 30 * 1000,
    });

    // Fetch unread count
    const { data: unreadCount = 0 } = useQuery({
        queryKey: notificationKeys.unreadCount(user?.uid || ''),
        queryFn: () => notificationRepo.getUnreadCount(user!.uid),
        enabled: !!user?.uid,
        staleTime: 10 * 1000,
    });

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: (notificationId: string) => notificationRepo.markAsRead(notificationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.list(user?.uid || '') });
            queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(user?.uid || '') });
        },
    });

    // Mark all as read mutation
    const markAllAsReadMutation = useMutation({
        mutationFn: () => notificationRepo.markAllAsRead(user!.uid),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.list(user?.uid || '') });
            queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(user?.uid || '') });
        },
    });

    // Real-time subscription
    useEffect(() => {
        if (!user?.uid) return;

        const channel = supabase
            .channel(`notifications:${user.uid}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.uid}`,
                },
                (payload) => {
                    console.log('[Notifications] New notification:', payload.new);
                    // Optimistically add to cache
                    queryClient.setQueryData(
                        notificationKeys.list(user.uid),
                        (old: Notification[] = []) => [payload.new as Notification, ...old]
                    );
                    // Increment unread count
                    queryClient.setQueryData(
                        notificationKeys.unreadCount(user.uid),
                        (old: number = 0) => old + 1
                    );
                }
            )
            .subscribe((status) => {
                setIsSubscribed(status === 'SUBSCRIBED');
                console.log('[Notifications] Subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.uid, queryClient]);

    const markAsRead = useCallback((id: string) => {
        markAsReadMutation.mutate(id);
    }, [markAsReadMutation]);

    const markAllAsRead = useCallback(() => {
        markAllAsReadMutation.mutate();
    }, [markAllAsReadMutation]);

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        isSubscribed,
        markAsRead,
        markAllAsRead,
    };
}
