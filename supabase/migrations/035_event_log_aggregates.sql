-- ============================================================================
-- Event Log Aggregates Migration
-- ============================================================================
-- Adds aggregate_type and aggregate_id columns for proper DDD event sourcing.
-- This enables efficient queries like "all events for ticket X".
-- ============================================================================

-- Add aggregate columns
ALTER TABLE event_log 
    ADD COLUMN IF NOT EXISTS aggregate_type TEXT,
    ADD COLUMN IF NOT EXISTS aggregate_id TEXT;

-- Create compound index for aggregate queries
CREATE INDEX IF NOT EXISTS idx_event_log_aggregate 
    ON event_log(aggregate_type, aggregate_id);

-- Backfill existing data (extract from payload)
UPDATE event_log 
SET 
    aggregate_type = 'event',
    aggregate_id = payload->>'eventId'
WHERE 
    payload->>'eventId' IS NOT NULL 
    AND aggregate_type IS NULL;

UPDATE event_log 
SET 
    aggregate_type = 'ticket',
    aggregate_id = payload->>'guestId'
WHERE 
    payload->>'guestId' IS NOT NULL 
    AND aggregate_type IS NULL;

-- Add request_id for full distributed tracing
ALTER TABLE event_log 
    ADD COLUMN IF NOT EXISTS request_id TEXT;

-- Comments
COMMENT ON COLUMN event_log.aggregate_type IS 
    'Type of aggregate root: event, ticket, payment, etc.';

COMMENT ON COLUMN event_log.aggregate_id IS 
    'ID of the aggregate root this event belongs to.';

COMMENT ON COLUMN event_log.request_id IS 
    'Unique ID for the HTTP request that triggered this event.';
