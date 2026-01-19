/**
 * Chat Send API
 * POST /api/chat/send
 * Sends a message to an event chat using Supabase Service Role for validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import * as chatRepo from '@/lib/repositories/chat.repository';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId, content, replyToId } = body;
        const supabase = getServiceSupabase();

        // 1. Verify Auth Token
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error('[ChatSend] Auth verification failed:', authError);
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        if (!eventId || !content?.trim()) {
            return NextResponse.json(
                { error: 'Missing eventId or content' },
                { status: 400 }
            );
        }

        // 2. Check if user is a valid guest (ticket holder)
        // We use Service Role to bypass RLS and query correctly
        const { data: guestRecord, error: guestError } = await supabase
            .from('guests')
            .select('status')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .single();

        // Also check if user is the HOST (owner of event)
        // A host might not be in the guests table
        let isHost = false;
        if (!guestRecord) {
            const { data: event } = await supabase
                .from('events')
                .select('organizer_id')
                .eq('id', eventId)
                .single();

            if (event && event.organizer_id === user.id) {
                isHost = true;
            }
        }

        if (!isHost) {
            if (guestError || !guestRecord) {
                return NextResponse.json(
                    { error: 'You must be registered for this event to chat' },
                    { status: 403 }
                );
            }

            // Optional: Block revoked tickets if you want
            if (guestRecord.status === 'rejected') {
                return NextResponse.json(
                    { error: 'Your access has been revoked' },
                    { status: 403 }
                );
            }
        }

        // 3. Check chat settings
        // Assuming chatRepo.getChatSettings handles its own logic or we can migrate it here too
        // For now, let's assume it works or we can just skip if it's too tied to other things.
        // It reads from `event_chat_settings` table via `supabase` (client) in the repo file?
        // Let's rely on the previous logic but maybe we need to be careful.
        // Actually, chatRepo uses `supabase` (client) or `getServiceSupabase`?
        // Let's just implement the check here directly using Service Role for speed/safety.

        const { data: settings } = await supabase
            .from('event_chat_settings')
            .select('*')
            .eq('event_id', eventId)
            .single();

        if (settings) {
            if (settings.is_enabled === false) {
                return NextResponse.json({ error: 'Chat is disabled' }, { status: 403 });
            }
            if (settings.is_locked === true && !isHost) { // Hosts can speak in locked chats
                return NextResponse.json({ error: 'Chat is locked' }, { status: 403 });
            }
        }

        // 4. Send message
        // Insert directly using verified user.id
        const { data: message, error: sendError } = await supabase
            .from('chat_messages')
            .insert({
                event_id: eventId,
                user_id: user.id, // Verified User ID from Token
                sender_name: user.user_metadata.full_name || user.email?.split('@')[0] || 'User',
                sender_avatar: user.user_metadata.avatar_url || null,
                content: content.trim(),
                type: 'text',
                reply_to_id: replyToId || null,
            })
            .select()
            .single();

        if (sendError) {
            console.error('[ChatSend] Database insert failed:', sendError);
            return NextResponse.json(
                { error: 'Failed to send message' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message,
        });

    } catch (error: any) {
        console.error('[ChatSend] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
