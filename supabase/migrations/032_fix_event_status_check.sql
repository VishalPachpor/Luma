-- ============================================================================
-- Fix Events Status Check Constraint
-- ============================================================================
-- Updates the status CHECK constraint to include new lifecycle states:
-- draft, published, live, ended, archived
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Add the updated constraint with all lifecycle states
ALTER TABLE events ADD CONSTRAINT events_status_check 
    CHECK (status IN ('draft', 'published', 'live', 'ended', 'archived'));
