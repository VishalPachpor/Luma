-- ============================================
-- Event Feedback System
-- Migration: 019_event_feedback.sql
-- ============================================

-- Table for collecting post-event star ratings and comments
CREATE TABLE IF NOT EXISTS event_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- One rating per user per event
    UNIQUE(event_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_event_feedback_event ON event_feedback(event_id);
CREATE INDEX IF NOT EXISTS idx_event_feedback_user ON event_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_event_feedback_created ON event_feedback(created_at DESC);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE event_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
    ON event_feedback FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
    ON event_feedback FOR SELECT
    USING (user_id = auth.uid()::text);

-- Calendar owners can view all feedback for their events
CREATE POLICY "Calendar owners can view event feedback"
    ON event_feedback FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN calendars c ON e.calendar_id = c.id
            WHERE e.id = event_feedback.event_id
            AND c.owner_id = auth.uid()::text
        )
    );

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback"
    ON event_feedback FOR UPDATE
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

-- Users can delete their own feedback
CREATE POLICY "Users can delete own feedback"
    ON event_feedback FOR DELETE
    USING (user_id = auth.uid()::text);

-- ============================================
-- Function: Update insights avg_rating on feedback change
-- ============================================

CREATE OR REPLACE FUNCTION update_insights_on_feedback()
RETURNS TRIGGER AS $$
DECLARE
    v_calendar_id UUID;
    v_avg DECIMAL(2,1);
    v_count INTEGER;
BEGIN
    -- Get calendar_id for the event
    SELECT e.calendar_id INTO v_calendar_id
    FROM events e
    WHERE e.id = COALESCE(NEW.event_id, OLD.event_id);
    
    IF v_calendar_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calculate new averages across all events in this calendar
    SELECT 
        ROUND(AVG(f.rating)::numeric, 1),
        COUNT(*)
    INTO v_avg, v_count
    FROM event_feedback f
    JOIN events e ON f.event_id = e.id
    WHERE e.calendar_id = v_calendar_id;
    
    -- Update calendar_insights
    UPDATE calendar_insights
    SET 
        avg_rating = v_avg,
        total_feedback_count = v_count,
        updated_at = NOW()
    WHERE calendar_id = v_calendar_id;
    
    -- Insert if not exists
    IF NOT FOUND THEN
        INSERT INTO calendar_insights (calendar_id, avg_rating, total_feedback_count)
        VALUES (v_calendar_id, v_avg, v_count)
        ON CONFLICT (calendar_id) DO UPDATE SET
            avg_rating = EXCLUDED.avg_rating,
            total_feedback_count = EXCLUDED.total_feedback_count,
            updated_at = NOW();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on feedback insert/update/delete
DROP TRIGGER IF EXISTS update_insights_on_feedback_trigger ON event_feedback;
CREATE TRIGGER update_insights_on_feedback_trigger
    AFTER INSERT OR UPDATE OR DELETE ON event_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_insights_on_feedback();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
