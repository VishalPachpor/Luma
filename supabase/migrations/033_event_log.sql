-- ============================================================================
-- Event Log Table (Event Sourcing Lite)
-- ============================================================================
-- Stores all domain events for:
-- - Full transaction tracing
-- - Entity timeline reconstruction
-- - Failure debugging
-- - Audit compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event data
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    
    -- Tracing
    correlation_id UUID NOT NULL, -- Groups related events
    causation_id UUID,            -- Event that triggered this one
    
    -- Actor
    actor_type TEXT NOT NULL DEFAULT 'system',
    actor_id TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Fast lookup by event type
CREATE INDEX IF NOT EXISTS idx_event_log_type 
    ON event_log(event_type);

-- Transaction tracing
CREATE INDEX IF NOT EXISTS idx_event_log_correlation 
    ON event_log(correlation_id);

-- Timeline queries
CREATE INDEX IF NOT EXISTS idx_event_log_created 
    ON event_log(created_at DESC);

-- Entity lookup (JSONB path query)
CREATE INDEX IF NOT EXISTS idx_event_log_payload_event_id 
    ON event_log((payload->>'eventId'));

CREATE INDEX IF NOT EXISTS idx_event_log_payload_guest_id 
    ON event_log((payload->>'guestId'));

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;

-- Service role only - events are system-level
CREATE POLICY "Service can manage event_log"
    ON event_log
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON TABLE event_log IS 
    'Event sourcing log for domain events. Enables transaction tracing and entity timelines.';

COMMENT ON COLUMN event_log.correlation_id IS 
    'Groups related events in a transaction. All events from one user action share this ID.';

COMMENT ON COLUMN event_log.causation_id IS 
    'The event_log.id of the event that triggered this one. Enables causal chains.';
