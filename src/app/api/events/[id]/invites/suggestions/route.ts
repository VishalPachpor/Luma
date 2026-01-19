/**
 * Invite Suggestions API
 * GET /api/events/:id/invites/suggestions
 * Returns suggested contacts for the user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    // const { id } = await context.params // Not strictly needed unless filtering suggestions by verified

    try {
        // 1. Auth Check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const supabase = getServiceSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Fetch Suggestions from Contact Book
        const { data: contacts, error } = await (supabase
            .from('contact_book' as any)
            .select('email, name, last_invited_at, invite_count')
            .eq('owner_id', user.id)
            .order('last_invited_at', { ascending: false })
            .limit(50) as any);

        if (error) {
            console.error('[Suggestions API] DB Error:', error);
            return NextResponse.json({ suggestions: [], remaining: 50 });
        }

        // 3. Get Invite Limits
        const { data: limitData } = await (supabase
            .from('invite_limits' as any)
            .select('limit_count, used_count')
            .eq('event_id', (await context.params).id)
            .maybeSingle() as any);

        const remaining = (limitData?.limit_count ?? 50) - (limitData?.used_count ?? 0);

        return NextResponse.json({
            suggestions: contacts?.map((c: any) => ({
                name: c.name || c.email.split('@')[0], // Fallback name
                email: c.email,
                source: 'contact_book'
            })) || [],
            remaining
        });

    } catch (error) {
        console.error('[Suggestions API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
