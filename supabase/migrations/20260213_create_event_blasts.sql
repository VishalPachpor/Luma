-- Event Blasts table for storing blast email history
-- This table tracks all blast emails sent to event guests

CREATE TABLE IF NOT EXISTS event_blasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    recipient_filter TEXT NOT NULL DEFAULT 'all',
    recipient_count INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_blasts_event_id ON event_blasts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_blasts_sender_id ON event_blasts(sender_id);
CREATE INDEX IF NOT EXISTS idx_event_blasts_created_at ON event_blasts(created_at DESC);

-- Enable RLS
ALTER TABLE event_blasts ENABLE ROW LEVEL SECURITY;

-- Policy: Event organizers can read their event blasts
CREATE POLICY "Organizers can read event blasts"
    ON event_blasts FOR SELECT
    USING (
        event_id IN (
            SELECT id FROM events WHERE organizer_id = auth.uid()
        )
    );

-- Policy: Event organizers can insert blasts for their events  
CREATE POLICY "Organizers can create event blasts"
    ON event_blasts FOR INSERT
    WITH CHECK (
        event_id IN (
            SELECT id FROM events WHERE organizer_id = auth.uid()
        )
    );

-- Policy: Service role can do everything (for Inngest)
CREATE POLICY "Service role full access on event_blasts"
    ON event_blasts FOR ALL
    USING (auth.role() = 'service_role');
