/**
 * Invite Tracking Pixel API Route
 * 
 * GET /api/invites/[token]/track
 * Returns a 1x1 transparent GIF and records the email open (idempotent)
 */

import { NextRequest, NextResponse } from 'next/server';
import * as inviteService from '@/lib/services/invite.service';

// 1x1 transparent GIF (base64 decoded)
const TRANSPARENT_GIF = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
);

interface RouteParams {
    params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { token } = await params;

        if (!token) {
            return new NextResponse(TRANSPARENT_GIF, {
                status: 200,
                headers: {
                    'Content-Type': 'image/gif',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            });
        }

        // Record the open (idempotent - only first open counts)
        await inviteService.handleInviteOpen(token);

        // Return transparent 1x1 GIF
        return new NextResponse(TRANSPARENT_GIF, {
            status: 200,
            headers: {
                'Content-Type': 'image/gif',
                'Content-Length': String(TRANSPARENT_GIF.length),
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        console.error('[TrackingPixel] Error:', error);
        // Still return the GIF even on error
        return new NextResponse(TRANSPARENT_GIF, {
            status: 200,
            headers: {
                'Content-Type': 'image/gif',
                'Cache-Control': 'no-cache',
            },
        });
    }
}
