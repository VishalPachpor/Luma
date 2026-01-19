/**
 * Chat Repository
 * Handles event chat messages using Supabase (Luma architecture)
 */

import { supabase, getServiceSupabase } from '@/lib/supabase';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Database } from '@/types/database.types';

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert'];

export interface SendMessageParams {
    eventId: string;
    userId: string;
    senderName: string;
    senderAvatar?: string | null;
    content: string;
    replyToId?: string | null;
}

/**
 * Send a chat message
 * Uses service role for trusted broker pattern
 */
export async function sendMessage(params: SendMessageParams): Promise<ChatMessage | null> {
    const { eventId, userId, senderName, senderAvatar, content, replyToId } = params;

    try {
        const serviceSupabase = getServiceSupabase();

        const { data, error } = await serviceSupabase
            .from('chat_messages')
            .insert({
                event_id: eventId,
                user_id: userId,
                sender_name: senderName,
                sender_avatar: senderAvatar || null,
                content: content.trim(),
                type: 'text',
                reply_to_id: replyToId || null,
            })
            .select()
            .single();

        if (error) {
            console.error('[ChatRepo] Send message failed:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('[ChatRepo] Send message error:', error);
        return null;
    }
}

/**
 * Get messages for an event (paginated)
 */
export async function getMessages(
    eventId: string,
    limit: number = 50,
    before?: string // ISO date for cursor pagination
): Promise<ChatMessage[]> {
    try {
        // Use browser client to ensure session is used for RLS
        const supabase = createSupabaseBrowserClient();

        let query = supabase
            .from('chat_messages')
            .select('*')
            .eq('event_id', eventId)
            // .is('deleted_at', null) // Temporarily disabled to debug 406 error
            .order('created_at', { ascending: false })
            .limit(limit);

        if (before) {
            query = query.lt('created_at', before);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[ChatRepo] Get messages failed:', error);
            return [];
        }

        // Reverse to show oldest first in UI
        return (data || []).reverse();
    } catch (error) {
        console.error('[ChatRepo] Get messages error:', error);
        return [];
    }
}

/**
 * Delete a message (soft delete)
 * Only host or message author can delete
 */
export async function deleteMessage(
    messageId: string,
    requesterId: string,
    hostId: string
): Promise<boolean> {
    try {
        const serviceSupabase = getServiceSupabase();

        // First check if requester is author or host
        const { data: message } = await serviceSupabase
            .from('chat_messages')
            .select('user_id')
            .eq('id', messageId)
            .single();

        if (!message) return false;

        const canDelete = message.user_id === requesterId || requesterId === hostId;
        if (!canDelete) return false;

        const { error } = await serviceSupabase
            .from('chat_messages')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', messageId);

        return !error;
    } catch (error) {
        console.error('[ChatRepo] Delete message error:', error);
        return false;
    }
}

/**
 * Send a system message (for announcements, etc.)
 */
export async function sendSystemMessage(
    eventId: string,
    content: string,
    type: 'system' | 'announcement' = 'system'
): Promise<ChatMessage | null> {
    try {
        const serviceSupabase = getServiceSupabase();

        const { data, error } = await serviceSupabase
            .from('chat_messages')
            .insert({
                event_id: eventId,
                user_id: null,
                sender_name: 'System',
                content,
                type,
            })
            .select()
            .single();

        if (error) {
            console.error('[ChatRepo] Send system message failed:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('[ChatRepo] Send system message error:', error);
        return null;
    }
}

/**
 * Get chat settings for an event
 */
export async function getChatSettings(eventId: string): Promise<{ isEnabled: boolean; isLocked: boolean }> {
    try {
        const { data } = await supabase
            .from('event_chat_settings')
            .select('*')
            .eq('event_id', eventId)
            .single();

        return {
            isEnabled: data?.is_enabled ?? true,
            isLocked: data?.is_locked ?? false,
        };
    } catch {
        // Default: enabled and unlocked
        return { isEnabled: true, isLocked: false };
    }
}

/**
 * Update chat settings (host only)
 */
export async function updateChatSettings(
    eventId: string,
    settings: { isEnabled?: boolean; isLocked?: boolean }
): Promise<boolean> {
    try {
        const serviceSupabase = getServiceSupabase();

        const { error } = await serviceSupabase
            .from('event_chat_settings')
            .upsert({
                event_id: eventId,
                is_enabled: settings.isEnabled,
                is_locked: settings.isLocked,
                updated_at: new Date().toISOString(),
            });

        return !error;
    } catch (error) {
        console.error('[ChatRepo] Update settings error:', error);
        return false;
    }
}
