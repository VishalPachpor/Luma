/**
 * Invite Search API
 * GET /api/invites/search?q=query
 * Searches the user's contact book and global user base (optional future).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json({ suggestions: [] });
    }

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

        // 2. Search Contact Book (Case insensitive ILIKE)
        const { data: contacts, error } = await (supabase
            .from('contact_book' as any)
            .select('email, name')
            .eq('owner_id', user.id)
            .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
            .limit(20) as any);

        if (error) {
            console.error('[Search API] DB Error:', error);
            return NextResponse.json({ suggestions: [] });
        }

        return NextResponse.json({
            suggestions: contacts?.map((c: any) => ({
                name: c.name || c.email.split('@')[0],
                email: c.email,
                avatar: null, // Placeholder for future avatar support
                source: 'contact_book'
            })) || []
        });

    } catch (error) {
        console.error('[Search API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
