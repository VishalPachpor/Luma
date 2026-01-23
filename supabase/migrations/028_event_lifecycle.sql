-- ============================================================================
-- Event Lifecycle State Machine Migration
-- ============================================================================
-- Adds support for full event lifecycle states:
--   draft → published → live → ended → archived
--
-- This migration adds:
--   1. Lifecycle timing columns (scheduled_start_at, scheduled_end_at)
--   2. Transition tracking columns (transitioned_at, previous_status)
--   3. Event status audit log table
--   4. Performance indexes for lifecycle cron queries
-- ============================================================================

-- 1. Add lifecycle timing columns to events table
-- These allow explicit control over when events go "live" vs using the date field
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ;

-- 2. Add transition tracking columns
-- These provide audit trail of status changes
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS transitioned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS previous_status TEXT;

-- 3. Create status transition audit log table
-- Provides complete history of all status changes for compliance and debugging
CREATE TABLE IF NOT EXISTS event_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  triggered_by TEXT NOT NULL, -- 'system' for cron jobs, 'user:{uuid}' for manual
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create index on event_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_event_status_log_event_id 
  ON event_status_log(event_id);

-- 5. Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_event_status_log_created_at 
  ON event_status_log(created_at DESC);

-- 6. Create composite index for lifecycle cron jobs
-- This index is critical for the event.start and event.end Inngest jobs
-- to efficiently find events that need to transition
CREATE INDEX IF NOT EXISTS idx_events_lifecycle_start 
  ON events(status, date) 
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_events_lifecycle_end 
  ON events(status, end_date) 
  WHERE status = 'live';

-- 7. Enable RLS on audit log table
ALTER TABLE event_status_log ENABLE ROW LEVEL SECURITY;

-- 8. Policy: Organizers can view their own event status logs
CREATE POLICY "Organizers can view their event status logs"
  ON event_status_log 
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- 9. Policy: Service role can insert (for system transitions)
-- Note: Service role bypasses RLS, but we add this for documentation
CREATE POLICY "Service can insert status logs"
  ON event_status_log 
  FOR INSERT
  WITH CHECK (true);

-- 10. Add comment for documentation
COMMENT ON TABLE event_status_log IS 
  'Audit log tracking all event status transitions for compliance and debugging';

COMMENT ON COLUMN events.scheduled_start_at IS 
  'When the event transitions to LIVE status. Defaults to event date if null';

COMMENT ON COLUMN events.scheduled_end_at IS 
  'When the event transitions to ENDED status. Defaults to end_date if null';

COMMENT ON COLUMN events.transitioned_at IS 
  'Timestamp of the last status transition';

COMMENT ON COLUMN events.previous_status IS 
  'The status before the last transition, for audit purposes';

-- 11. Backfill: Set scheduled times based on existing date/end_date
-- This ensures existing events work with the new lifecycle system
UPDATE events 
SET 
  scheduled_start_at = COALESCE(scheduled_start_at, date::timestamptz),
  scheduled_end_at = COALESCE(scheduled_end_at, end_date::timestamptz)
WHERE scheduled_start_at IS NULL OR scheduled_end_at IS NULL;
