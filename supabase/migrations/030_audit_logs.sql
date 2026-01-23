-- ============================================================================
-- Audit Logging System Migration
-- ============================================================================
-- Creates a centralized audit log for tracking all significant actions
-- Supports: event changes, guest changes, payment actions, admin actions
-- ============================================================================

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What was affected
    entity_type TEXT NOT NULL, -- 'event', 'guest', 'calendar', 'user', 'payment'
    entity_id TEXT NOT NULL, -- Using TEXT for flexibility with different ID types
    
    -- What happened
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'status_changed', etc.
    
    -- Who did it
    actor_id TEXT, -- User ID (null for system actions), TEXT for flexibility
    actor_type TEXT NOT NULL DEFAULT 'user', -- 'user', 'system', 'cron', 'webhook'
    
    -- Details
    changes JSONB, -- { field: { old: x, new: y } }
    metadata JSONB DEFAULT '{}',
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
    ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor 
    ON audit_logs(actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
    ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
    ON audit_logs(created_at DESC);

-- Composite index for timeline queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_timeline 
    ON audit_logs(entity_type, entity_id, created_at DESC);

-- 3. Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Users can view audit logs for entities they own/manage
CREATE POLICY "View own audit logs"
    ON audit_logs
    FOR SELECT
    USING (
        -- Can see logs for events they organize
        (entity_type = 'event' AND entity_id::text IN (
            SELECT id::text FROM events WHERE organizer_id::text = auth.uid()::text
        ))
        OR
        -- Can see logs for calendars they own
        (entity_type = 'calendar' AND entity_id::text IN (
            SELECT id::text FROM calendars WHERE owner_id::text = auth.uid()::text
        ))
        OR
        -- Can see logs where they are the actor
        actor_id::text = auth.uid()::text
    );

-- 5. Policy: Service role can insert (for system logging)
CREATE POLICY "Service can insert audit logs"
    ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- 6. Add documentation
COMMENT ON TABLE audit_logs IS 
    'Centralized audit log for compliance, debugging, and activity tracking';

COMMENT ON COLUMN audit_logs.changes IS 
    'JSON diff of changed fields: { fieldName: { old: value, new: value } }';
