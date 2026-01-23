-- ============================================================================
-- Event Roles (RBAC) Migration
-- ============================================================================
-- Implements role-based access control for events:
--   - owner: Full control (auto-assigned to organizer)
--   - admin: Edit event, manage guests, view analytics
--   - staff: Check-in only
--   - viewer: View only (for draft sharing)
-- ============================================================================

-- 1. Create event_roles table if not exists
CREATE TABLE IF NOT EXISTS event_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL, -- TEXT for flexibility with existing ID types
    user_id TEXT NOT NULL,  -- TEXT for flexibility
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff', 'viewer')),
    granted_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each user can only have one role per event
    UNIQUE(event_id, user_id)
);

-- 2. Create indexes (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS idx_event_roles_event_id 
    ON event_roles(event_id);

CREATE INDEX IF NOT EXISTS idx_event_roles_user_id 
    ON event_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_event_roles_role 
    ON event_roles(event_id, role);

-- 3. Enable RLS
ALTER TABLE event_roles ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "View event roles" ON event_roles;
DROP POLICY IF EXISTS "Manage event roles" ON event_roles;

-- 5. Policy: Users can view roles for events they have access to
CREATE POLICY "View event roles"
    ON event_roles
    FOR SELECT
    USING (
        -- Can see if you're the event organizer
        event_id::text IN (
            SELECT id::text FROM events WHERE organizer_id::text = auth.uid()::text
        )
        OR
        -- Can see if you have a role on this event
        user_id::text = auth.uid()::text
    );

-- 6. Policy: Only owners/admins can manage roles
CREATE POLICY "Manage event roles"
    ON event_roles
    FOR ALL
    USING (
        event_id::text IN (
            SELECT id::text FROM events WHERE organizer_id::text = auth.uid()::text
        )
        OR
        event_id::text IN (
            SELECT event_id::text FROM event_roles 
            WHERE user_id::text = auth.uid()::text AND role IN ('owner', 'admin')
        )
    );

-- 7. Auto-create owner role for event organizer
CREATE OR REPLACE FUNCTION auto_create_owner_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO event_roles (event_id, user_id, role)
    VALUES (NEW.id::text, NEW.organizer_id::text, 'owner')
    ON CONFLICT (event_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_auto_create_owner_role ON events;
CREATE TRIGGER trigger_auto_create_owner_role
    AFTER INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_owner_role();

-- 8. Add documentation
COMMENT ON TABLE event_roles IS 
    'Role-based access control for events. Roles: owner, admin, staff, viewer';

COMMENT ON COLUMN event_roles.role IS 
    'owner=full control, admin=edit+manage, staff=check-in, viewer=read-only';
