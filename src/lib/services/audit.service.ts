/**
 * Audit Logging Service
 * 
 * Centralized audit logging for compliance and debugging.
 * Tracks all significant actions: creates, updates, deletes, status changes.
 */

import { getServiceSupabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

export type EntityType = 'event' | 'guest' | 'calendar' | 'user' | 'payment' | 'invitation';

export type AuditAction =
    | 'created'
    | 'updated'
    | 'deleted'
    | 'status_changed'
    | 'published'
    | 'archived'
    | 'checked_in'
    | 'staked'
    | 'refunded'
    | 'forfeited'
    | 'invited'
    | 'approved'
    | 'rejected'
    | 'payment_received'
    | 'payment_released';

export type ActorType = 'user' | 'system' | 'cron' | 'webhook';

export interface AuditLogEntry {
    entityType: EntityType;
    entityId: string;
    action: AuditAction;
    actorId?: string;
    actorType?: ActorType;
    changes?: Record<string, { old: unknown; new: unknown }>;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

export interface AuditLogRecord {
    id: string;
    entityType: EntityType;
    entityId: string;
    action: AuditAction;
    actorId: string | null;
    actorType: ActorType;
    changes: Record<string, { old: unknown; new: unknown }> | null;
    metadata: Record<string, unknown>;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<string | null> {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
        .from('audit_logs')
        .insert({
            entity_type: entry.entityType,
            entity_id: entry.entityId,
            action: entry.action,
            actor_id: entry.actorId || null,
            actor_type: entry.actorType || 'system',
            changes: entry.changes || null,
            metadata: entry.metadata || {},
            ip_address: entry.ipAddress || null,
            user_agent: entry.userAgent || null,
        })
        .select('id')
        .single();

    if (error) {
        console.error('[AuditLog] Failed to create log:', error);
        return null;
    }

    return data.id;
}

/**
 * Log entity creation
 */
export async function logCreated(
    entityType: EntityType,
    entityId: string,
    actorId?: string,
    metadata?: Record<string, unknown>
): Promise<string | null> {
    return createAuditLog({
        entityType,
        entityId,
        action: 'created',
        actorId,
        actorType: actorId ? 'user' : 'system',
        metadata,
    });
}

/**
 * Log entity update with diff
 */
export async function logUpdated(
    entityType: EntityType,
    entityId: string,
    changes: Record<string, { old: unknown; new: unknown }>,
    actorId?: string,
    metadata?: Record<string, unknown>
): Promise<string | null> {
    return createAuditLog({
        entityType,
        entityId,
        action: 'updated',
        actorId,
        actorType: actorId ? 'user' : 'system',
        changes,
        metadata,
    });
}

/**
 * Log status change
 */
export async function logStatusChanged(
    entityType: EntityType,
    entityId: string,
    oldStatus: string,
    newStatus: string,
    actorId?: string,
    reason?: string
): Promise<string | null> {
    return createAuditLog({
        entityType,
        entityId,
        action: 'status_changed',
        actorId,
        actorType: actorId ? 'user' : 'system',
        changes: {
            status: { old: oldStatus, new: newStatus },
        },
        metadata: reason ? { reason } : undefined,
    });
}

/**
 * Log deletion
 */
export async function logDeleted(
    entityType: EntityType,
    entityId: string,
    actorId?: string,
    metadata?: Record<string, unknown>
): Promise<string | null> {
    return createAuditLog({
        entityType,
        entityId,
        action: 'deleted',
        actorId,
        actorType: actorId ? 'user' : 'system',
        metadata,
    });
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get audit logs for an entity
 */
export async function getEntityAuditLogs(
    entityType: EntityType,
    entityId: string,
    limit: number = 50
): Promise<AuditLogRecord[]> {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[AuditLog] Query failed:', error);
        return [];
    }

    return (data || []).map(normalizeAuditLog);
}

/**
 * Get audit logs by actor
 */
export async function getActorAuditLogs(
    actorId: string,
    limit: number = 50
): Promise<AuditLogRecord[]> {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('actor_id', actorId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[AuditLog] Query failed:', error);
        return [];
    }

    return (data || []).map(normalizeAuditLog);
}

/**
 * Get recent audit logs (admin view)
 */
export async function getRecentAuditLogs(
    limit: number = 100,
    entityType?: EntityType
): Promise<AuditLogRecord[]> {
    const supabase = getServiceSupabase();

    let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (entityType) {
        query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[AuditLog] Query failed:', error);
        return [];
    }

    return (data || []).map(normalizeAuditLog);
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeAuditLog(row: any): AuditLogRecord {
    return {
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        actorId: row.actor_id,
        actorType: row.actor_type,
        changes: row.changes,
        metadata: row.metadata || {},
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
    };
}

/**
 * Compute diff between two objects for audit logging
 */
export function computeChanges(
    oldObj: Record<string, unknown>,
    newObj: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> | null {
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
        const oldVal = oldObj[key];
        const newVal = newObj[key];

        // Skip if values are equal
        if (JSON.stringify(oldVal) === JSON.stringify(newVal)) {
            continue;
        }

        // Skip internal fields
        if (key.startsWith('_') || key === 'updatedAt' || key === 'updated_at') {
            continue;
        }

        changes[key] = { old: oldVal, new: newVal };
    }

    return Object.keys(changes).length > 0 ? changes : null;
}
