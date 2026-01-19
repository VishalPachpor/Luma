/**
 * Auth Callback Route
 * Handles OAuth redirects and Magic Link verification
 */

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/';

    if (code) {
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('[Auth Callback] Error:', error);
            return NextResponse.redirect(new URL('/login?error=auth_error', requestUrl.origin));
        }
    }

    // Redirect to the intended destination or home
    return NextResponse.redirect(new URL(next, requestUrl.origin));
}
