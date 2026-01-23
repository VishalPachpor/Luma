/**
 * Event Roles API
 * 
 * GET /api/events/[id]/roles - Get all roles for event
 * POST /api/events/[id]/roles - Assign role to user
 * DELETE /api/events/[id]/roles - Remove user's role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import {
    getEventRoles,
    assignRole,
    removeRole,
    hasPermission,
    EventRole,
} from '@/lib/services/roles.service';

interface RouteContext {
    params: Promise<{ id: string }>;
}

/**
 * GET - List all roles for an event
 */
export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    const { id: eventId } = await context.params;
    const supabase = getServiceSupabase();

    // Auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user can view roles
    const canView = await hasPermission(eventId, user.id, 'canView');
    if (!canView) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const roles = await getEventRoles(eventId);

    return NextResponse.json({ roles });
}

/**
 * POST - Assign a role to a user
 */
export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    const { id: eventId } = await context.params;
    const supabase = getServiceSupabase();

    // Auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, role } = body as { userId: string; role: EventRole };

    if (!userId || !role) {
        return NextResponse.json(
            { error: 'Missing required fields: userId, role' },
            { status: 400 }
        );
    }

    const validRoles: EventRole[] = ['admin', 'staff', 'viewer'];
    if (!validRoles.includes(role)) {
        return NextResponse.json(
            { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
            { status: 400 }
        );
    }

    const result = await assignRole(eventId, userId, role, user.id);

    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true, eventId, userId, role });
}

/**
 * DELETE - Remove a user's role
 */
export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    const { id: eventId } = await context.params;
    const supabase = getServiceSupabase();

    // Auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId param' }, { status: 400 });
    }

    const result = await removeRole(eventId, userId, user.id);

    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true, eventId, userId });
}
