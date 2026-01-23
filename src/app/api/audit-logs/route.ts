/**
 * Audit Logs API
 * 
 * GET /api/audit-logs
 * Query audit logs for entities the user has access to
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import {
    getEntityAuditLogs,
    getActorAuditLogs,
    EntityType,
} from '@/lib/services/audit.service';

export async function GET(request: NextRequest) {
    const supabase = getServiceSupabase();
    const searchParams = request.nextUrl.searchParams;

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

    // Query params
    const entityType = searchParams.get('entityType') as EntityType | null;
    const entityId = searchParams.get('entityId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    try {
        let logs;

        if (entityType && entityId) {
            // Get logs for specific entity
            logs = await getEntityAuditLogs(entityType, entityId, limit);
        } else {
            // Get logs where user is actor
            logs = await getActorAuditLogs(user.id, limit);
        }

        return NextResponse.json({ logs });
    } catch (error: any) {
        console.error('[AuditAPI] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
