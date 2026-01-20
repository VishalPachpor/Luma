-- ============================================
-- Calendar Insights (Materialized Analytics)
-- Migration: 014_calendar_insights.sql
-- ============================================

-- This table stores pre-computed analytics for each calendar.
-- Updated via background jobs, not real-time queries.

CREATE TABLE IF NOT EXISTS calendar_insights (
    calendar_id UUID PRIMARY KEY REFERENCES calendars(id) ON DELETE CASCADE,
    
    -- Lifetime aggregates
    total_events INTEGER DEFAULT 0,
    total_tickets_sold INTEGER DEFAULT 0,
    total_subscribers INTEGER DEFAULT 0,
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    
    -- Weekly trends (for "vs last week" display)
    events_this_week INTEGER DEFAULT 0,
    tickets_this_week INTEGER DEFAULT 0,
    subscribers_this_week INTEGER DEFAULT 0,
    revenue_this_week DECIMAL(10, 2) DEFAULT 0,
    
    -- Average event rating
    avg_rating DECIMAL(2, 1),
    total_feedback_count INTEGER DEFAULT 0,
    
    -- Timestamps
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- Function: Refresh calendar insights
-- ============================================

CREATE OR REPLACE FUNCTION refresh_calendar_insights(p_calendar_id UUID)
RETURNS VOID AS $$
DECLARE
    v_one_week_ago TIMESTAMPTZ := NOW() - INTERVAL '7 days';
BEGIN
    INSERT INTO calendar_insights (
        calendar_id,
        total_events,
        total_tickets_sold,
        total_subscribers,
        total_revenue,
        events_this_week,
        tickets_this_week,
        subscribers_this_week,
        revenue_this_week,
        updated_at
    )
    SELECT
        p_calendar_id,
        -- Total events
        (SELECT COUNT(*) FROM events WHERE calendar_id = p_calendar_id AND status = 'published'),
        -- Total tickets sold
        (SELECT COALESCE(SUM(sold_count), 0) FROM ticket_tiers tt 
         JOIN events e ON tt.event_id = e.id WHERE e.calendar_id = p_calendar_id),
        -- Total subscribers (people with subscribed = true)
        (SELECT COUNT(*) FROM calendar_people WHERE calendar_id = p_calendar_id AND subscribed = true),
        -- Total revenue
        (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o
         JOIN events e ON o.event_id = e.id 
         WHERE e.calendar_id = p_calendar_id AND o.status = 'confirmed'),
        -- Events this week
        (SELECT COUNT(*) FROM events 
         WHERE calendar_id = p_calendar_id AND status = 'published' AND created_at >= v_one_week_ago),
        -- Tickets this week (approximation based on orders)
        (SELECT COALESCE(SUM(o.quantity), 0) FROM orders o
         JOIN events e ON o.event_id = e.id 
         WHERE e.calendar_id = p_calendar_id AND o.status = 'confirmed' AND o.created_at >= v_one_week_ago),
        -- Subscribers this week
        (SELECT COUNT(*) FROM calendar_people 
         WHERE calendar_id = p_calendar_id AND joined_at >= v_one_week_ago),
        -- Revenue this week
        (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o
         JOIN events e ON o.event_id = e.id 
         WHERE e.calendar_id = p_calendar_id AND o.status = 'confirmed' AND o.created_at >= v_one_week_ago),
        NOW()
    ON CONFLICT (calendar_id) 
    DO UPDATE SET
        total_events = EXCLUDED.total_events,
        total_tickets_sold = EXCLUDED.total_tickets_sold,
        total_subscribers = EXCLUDED.total_subscribers,
        total_revenue = EXCLUDED.total_revenue,
        events_this_week = EXCLUDED.events_this_week,
        tickets_this_week = EXCLUDED.tickets_this_week,
        subscribers_this_week = EXCLUDED.subscribers_this_week,
        revenue_this_week = EXCLUDED.revenue_this_week,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Auto-create insights row on calendar creation
-- ============================================

CREATE OR REPLACE FUNCTION create_calendar_insights()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO calendar_insights (calendar_id)
    VALUES (NEW.id)
    ON CONFLICT (calendar_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_calendar_insights_trigger ON calendars;
CREATE TRIGGER create_calendar_insights_trigger
    AFTER INSERT ON calendars
    FOR EACH ROW
    EXECUTE FUNCTION create_calendar_insights();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE calendar_insights ENABLE ROW LEVEL SECURITY;

-- Calendar owners can view their insights
CREATE POLICY "Calendar owners can view their insights"
    ON calendar_insights FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM calendars 
            WHERE calendars.id = calendar_insights.calendar_id 
            AND calendars.owner_id = auth.uid()::text
        )
    );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
