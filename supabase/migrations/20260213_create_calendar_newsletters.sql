-- Calendar Newsletters table for storing newsletter history
-- Tracks all newsletter emails sent to calendar subscribers

CREATE TABLE IF NOT EXISTS calendar_newsletters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_newsletters_calendar_id ON calendar_newsletters(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_newsletters_created_at ON calendar_newsletters(created_at DESC);

-- Enable RLS
ALTER TABLE calendar_newsletters ENABLE ROW LEVEL SECURITY;

-- Policy: Calendar owners can read their newsletters
CREATE POLICY "Calendar owners can read newsletters"
    ON calendar_newsletters FOR SELECT
    USING (
        calendar_id IN (
            SELECT id FROM calendars WHERE user_id = auth.uid()
        )
    );

-- Policy: Calendar owners can insert newsletters
CREATE POLICY "Calendar owners can create newsletters"
    ON calendar_newsletters FOR INSERT
    WITH CHECK (
        calendar_id IN (
            SELECT id FROM calendars WHERE user_id = auth.uid()
        )
    );

-- Policy: Service role full access
CREATE POLICY "Service role full access on calendar_newsletters"
    ON calendar_newsletters FOR ALL
    USING (auth.role() = 'service_role');
