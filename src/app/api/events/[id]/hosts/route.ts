import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { canManageEvent } from '@/lib/services/permissions.service';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: eventId } = await context.params;

    try {
        const supabase = getServiceSupabase();

        // Fetch hosts
        const { data: hosts, error } = await supabase
            .from('event_hosts' as any)
            .select('*')
            .eq('event_id', eventId);

        if (error) throw error;

        return NextResponse.json({ hosts });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: eventId } = await context.params;

    try {
        const body = await request.json();
        const { email } = body;

        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

        // Auth check
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split('Bearer ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabase = getServiceSupabase();
        const { data: { user } } = await supabase.auth.getUser(token);

        if (!user || !await canManageEvent(user.id, eventId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Lookup user by email to get ID (if they exist in Auth)
        // NOTE: Supabase Admin API needed to list users by email, OR rely on public profiles if available.
        // For now, we store email, and optionally user_id if we can find it. 
        // Or we just store email and user_id is null until they claim it?
        // Let's try to find them in 'users' or 'profiles' table if it exists?
        // Actually, 'event_hosts' has user_id. Ideally we want to link it.
        // If we can't search users, we just store email.

        // Attempt to find user ID from public profiles or similar?
        // Since we are using service role, we might have access to auth.users but direct query is tricky.
        // For this version, let's just insert with email. If they sign in, we might need a trigger to link it,
        // or just rely on email matching for display.

        // Check if already host
        const { data: existing } = await supabase
            .from('event_hosts' as any)
            .select('id')
            .eq('event_id', eventId)
            .eq('email', email)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'Already a host' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('event_hosts' as any)
            .insert({
                event_id: eventId,
                email: email,
                role: 'host'
                // user_id: ??? we don't have it easily without admin API search
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ host: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: eventId } = await context.params;

    try {
        const { searchParams } = new URL(request.url);
        const hostId = searchParams.get('hostId');

        if (!hostId) return NextResponse.json({ error: 'Host ID required' }, { status: 400 });

        // Auth check
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split('Bearer ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabase = getServiceSupabase();
        const { data: { user } } = await supabase.auth.getUser(token);

        if (!user || !await canManageEvent(user.id, eventId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { error } = await supabase
            .from('event_hosts' as any)
            .delete()
            .eq('id', hostId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
