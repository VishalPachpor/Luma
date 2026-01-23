/**
 * Event Roles Service (RBAC)
 * 
 * Manages role-based access control for events.
 * Roles: owner, admin, staff, viewer
 */

import { getServiceSupabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

export type EventRole = 'owner' | 'admin' | 'staff' | 'viewer';

export interface EventRoleRecord {
    id: string;
    eventId: string;
    userId: string;
    role: EventRole;
    grantedBy: string | null;
    createdAt: string;
}

export interface EventPermissions {
    canView: boolean;
    canEdit: boolean;
    canManageGuests: boolean;
    canCheckIn: boolean;
    canManageRoles: boolean;
    canDelete: boolean;
    role: EventRole | null;
}

// ============================================================================
// Permission Maps
// ============================================================================

const ROLE_PERMISSIONS: Record<EventRole, Omit<EventPermissions, 'role'>> = {
    owner: {
        canView: true,
        canEdit: true,
        canManageGuests: true,
        canCheckIn: true,
        canManageRoles: true,
        canDelete: true,
    },
    admin: {
        canView: true,
        canEdit: true,
        canManageGuests: true,
        canCheckIn: true,
        canManageRoles: false,
        canDelete: false,
    },
    staff: {
        canView: true,
        canEdit: false,
        canManageGuests: false,
        canCheckIn: true,
        canManageRoles: false,
        canDelete: false,
    },
    viewer: {
        canView: true,
        canEdit: false,
        canManageGuests: false,
        canCheckIn: false,
        canManageRoles: false,
        canDelete: false,
    },
};

const NO_PERMISSIONS: EventPermissions = {
    canView: false,
    canEdit: false,
    canManageGuests: false,
    canCheckIn: false,
    canManageRoles: false,
    canDelete: false,
    role: null,
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get user's role for an event
 */
export async function getUserRole(eventId: string, userId: string): Promise<EventRole | null> {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
        .from('event_roles')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    return data.role as EventRole;
}

/**
 * Get user's permissions for an event
 */
export async function getEventPermissions(eventId: string, userId: string): Promise<EventPermissions> {
    const role = await getUserRole(eventId, userId);

    if (!role) {
        // Check if user is the event organizer (legacy check)
        const supabase = getServiceSupabase();
        const { data: event } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', eventId)
            .single();

        if (event?.organizer_id === userId) {
            return { ...ROLE_PERMISSIONS.owner, role: 'owner' };
        }

        return NO_PERMISSIONS;
    }

    return { ...ROLE_PERMISSIONS[role], role };
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
    eventId: string,
    userId: string,
    permission: keyof Omit<EventPermissions, 'role'>
): Promise<boolean> {
    const permissions = await getEventPermissions(eventId, userId);
    return permissions[permission];
}

/**
 * Assign a role to a user
 */
export async function assignRole(
    eventId: string,
    userId: string,
    role: EventRole,
    grantedBy: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = getServiceSupabase();

    // Check if granter has permission to manage roles
    const canManage = await hasPermission(eventId, grantedBy, 'canManageRoles');
    if (!canManage) {
        return { success: false, error: 'Not authorized to manage roles' };
    }

    // Cannot assign owner role (must be transferred, not assigned)
    if (role === 'owner') {
        return { success: false, error: 'Owner role cannot be assigned directly' };
    }

    const { error } = await supabase
        .from('event_roles')
        .upsert({
            event_id: eventId,
            user_id: userId,
            role,
            granted_by: grantedBy,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'event_id,user_id',
        });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Remove a user's role
 */
export async function removeRole(
    eventId: string,
    userId: string,
    removedBy: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = getServiceSupabase();

    // Check permission
    const canManage = await hasPermission(eventId, removedBy, 'canManageRoles');
    if (!canManage) {
        return { success: false, error: 'Not authorized to manage roles' };
    }

    // Cannot remove owner
    const role = await getUserRole(eventId, userId);
    if (role === 'owner') {
        return { success: false, error: 'Cannot remove owner role' };
    }

    const { error } = await supabase
        .from('event_roles')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Get all roles for an event
 */
export async function getEventRoles(eventId: string): Promise<EventRoleRecord[]> {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
        .from('event_roles')
        .select('*')
        .eq('event_id', eventId)
        .order('role');

    if (error || !data) {
        return [];
    }

    return data.map(normalizeRole);
}

/**
 * Get all events where user has a role
 */
export async function getUserEventRoles(userId: string): Promise<EventRoleRecord[]> {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
        .from('event_roles')
        .select('*')
        .eq('user_id', userId);

    if (error || !data) {
        return [];
    }

    return data.map(normalizeRole);
}

/**
 * Transfer ownership to another user
 */
export async function transferOwnership(
    eventId: string,
    newOwnerId: string,
    currentOwnerId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = getServiceSupabase();

    // Verify current owner
    const currentRole = await getUserRole(eventId, currentOwnerId);
    if (currentRole !== 'owner') {
        return { success: false, error: 'Only owner can transfer ownership' };
    }

    // Update event organizer
    const { error: eventError } = await supabase
        .from('events')
        .update({ organizer_id: newOwnerId })
        .eq('id', eventId);

    if (eventError) {
        return { success: false, error: eventError.message };
    }

    // Demote old owner to admin
    await supabase
        .from('event_roles')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('event_id', eventId)
        .eq('user_id', currentOwnerId);

    // Promote new owner
    await supabase
        .from('event_roles')
        .upsert({
            event_id: eventId,
            user_id: newOwnerId,
            role: 'owner',
            granted_by: currentOwnerId,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'event_id,user_id',
        });

    return { success: true };
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeRole(row: any): EventRoleRecord {
    return {
        id: row.id,
        eventId: row.event_id,
        userId: row.user_id,
        role: row.role,
        grantedBy: row.granted_by,
        createdAt: row.created_at,
    };
}
