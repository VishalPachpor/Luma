/**
 * Batch Invites API Route
 * 
 * POST /api/invites/batch
 * Send multiple invitations in one request
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as inviteService from '@/lib/services/invite.service';
import { z } from 'zod';

// Validation schema
const BatchInviteSchema = z.object({
    eventId: z.string().uuid(),
    eventTitle: z.string().min(1),
    emails: z.array(
        z.object({
            email: z.string().email(),
            name: z.string().optional(),
        })
    ).min(1).max(100), // Max 100 per batch
    source: z.enum(['manual', 'calendar', 'import', 'csv', 'api']).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const validation = BatchInviteSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: validation.error.issues
                },
                { status: 400 }
            );
        }

        const { eventId, eventTitle, emails, source } = validation.data;

        // Get authenticated user from Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authorization required' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);

        // Verify token and get user
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: { Authorization: `Bearer ${token}` }
            }
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // Get user profile for sender info
        const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();

        // Send batch invites
        const result = await inviteService.sendBatchInvites({
            eventId,
            eventTitle,
            emails,
            senderInfo: {
                uid: user.id,
                name: profile?.display_name || user.email?.split('@')[0] || 'User',
                email: user.email || '',
            },
            source: source ?? 'api',
        });

        return NextResponse.json({
            success: result.success,
            created: result.created,
            duplicates: result.duplicates,
            failed: result.failed,
            jobIds: result.jobIds,
        });

    } catch (error) {
        console.error('[BatchInvites] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
