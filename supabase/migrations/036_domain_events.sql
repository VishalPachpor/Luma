-- ============================================================================
-- Domain Events Table (V3 - Event Sourcing)
-- ============================================================================
-- Formal domain event store with versioning and aggregate roots.
-- Enables: replay, audit, projections, recovery
-- ============================================================================

CREATE TABLE IF NOT EXISTS domain_events (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Aggregate Root (DDD pattern)
    aggregate_type TEXT NOT NULL,  -- 'event', 'ticket', 'payment', 'calendar'
    aggregate_id UUID NOT NULL,
    
    -- Event Data
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    
    -- Versioning (for optimistic concurrency)
    version INT NOT NULL DEFAULT 1,
    
    -- Tracing
    correlation_id UUID NOT NULL,
    causation_id UUID,
    request_id UUID,
    
    -- Actor
    actor_type TEXT NOT NULL DEFAULT 'system',
    actor_id TEXT,
    
    -- Temporal
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Aggregate stream (primary query pattern)
CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate 
    ON domain_events(aggregate_type, aggregate_id, version);

-- Event type queries
CREATE INDEX IF NOT EXISTS idx_domain_events_type 
    ON domain_events(event_type);

-- Correlation tracing
CREATE INDEX IF NOT EXISTS idx_domain_events_correlation 
    ON domain_events(correlation_id);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_domain_events_occurred 
    ON domain_events(occurred_at DESC);

-- ============================================================================
-- Constraints
-- ============================================================================

-- Ensure version uniqueness per aggregate (optimistic concurrency)
CREATE UNIQUE INDEX IF NOT EXISTS idx_domain_events_aggregate_version 
    ON domain_events(aggregate_type, aggregate_id, version);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage domain_events"
    ON domain_events
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- Functions
-- ============================================================================

-- Get next version for an aggregate
CREATE OR REPLACE FUNCTION get_next_event_version(
    p_aggregate_type TEXT,
    p_aggregate_id UUID
) RETURNS INT AS $$
DECLARE
    next_version INT;
BEGIN
    SELECT COALESCE(MAX(version), 0) + 1
    INTO next_version
    FROM domain_events
    WHERE aggregate_type = p_aggregate_type
      AND aggregate_id = p_aggregate_id;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE domain_events IS 
    'First-class domain event store for event sourcing. Immutable append-only log.';

COMMENT ON COLUMN domain_events.aggregate_type IS 
    'Type of aggregate root: event, ticket, payment, calendar';

COMMENT ON COLUMN domain_events.aggregate_id IS 
    'ID of the aggregate root this event belongs to';

COMMENT ON COLUMN domain_events.version IS 
    'Sequential version number within the aggregate stream. Used for optimistic concurrency.';

COMMENT ON COLUMN domain_events.occurred_at IS 
    'When the event actually happened in the domain (business time)';

COMMENT ON COLUMN domain_events.created_at IS 
    'When the event was persisted to the store (system time)';
