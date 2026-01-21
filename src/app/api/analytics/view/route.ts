
import { NextRequest, NextResponse } from 'next/server';
import { recordView } from '@/lib/repositories/analytics.repository';
import { getServiceSupabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId, source, sessionId } = body;

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        // Try to get logged-in user
        const supabase = getServiceSupabase();
        // Since this is a server-side call from client, we can't easily read user session from cookies without
        // using createServerClient with cookie store. 
        // For strict analytics, we might want that. 
        // For now, let's rely on the client passing userId if they want, 
        // OR better: Just record it as anonymous if we can't easily verify. 
        // Let's rely on a passed-in optional userId but we must be careful not to trust it blindly for sensitive actions.
        // For analytics, trusting the client provided userId is okay-ish for non-critical stats, 
        // but better to verify auth.

        // Simpler approach for Phase 1: Client sends `sessionId` (anonymous UUID) 
        // and we check for Auth header to get real userId.

        let userId: string | undefined;
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split('Bearer ')[1];
            const { data: { user } } = await supabase.auth.getUser(token);
            userId = user?.id;
        }

        await recordView(eventId, {
            userId,
            sessionId: sessionId || 'unknown',
            referrer: request.headers.get('referer') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            metadata: { source }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
