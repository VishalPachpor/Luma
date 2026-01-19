/**
 * Invites API Route
 * Sends event invitation emails using Resend
 */

import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';

/**
 * POST /api/invites
 * Send an invitation email
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId, eventTitle, recipientEmail, senderName } = body;

        // Validation
        if (!eventId || !eventTitle || !recipientEmail) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
            return NextResponse.json(
                { error: 'Invalid email address' },
                { status: 400 }
            );
        }

        // Trigger background job via Inngest
        // This returns immediately, making the API fast and resilient
        const { ids } = await inngest.send({
            name: "app/invite.sent",
            data: body,
        });

        return NextResponse.json({
            success: true,
            jobId: ids[0],
            message: 'Invite queued for sending',
        });

    } catch (error) {
        console.error('Invite API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
