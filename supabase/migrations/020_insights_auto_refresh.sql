-- ============================================
-- Insights Auto-Refresh Triggers
-- Migration: 020_insights_auto_refresh.sql
-- ============================================

-- This migration adds triggers to automatically refresh calendar_insights
-- when events, orders, or subscriptions change.

-- ============================================
-- Trigger: Refresh insights on event changes
-- ============================================

CREATE OR REPLACE FUNCTION refresh_insights_on_event_change()
RETURNS TRIGGER AS $$
DECLARE
    v_calendar_id UUID;
BEGIN
    -- Get calendar_id (from NEW for insert/update, OLD for delete)
    v_calendar_id := COALESCE(NEW.calendar_id, OLD.calendar_id);
    
    IF v_calendar_id IS NOT NULL THEN
        -- Call the existing refresh function
        PERFORM refresh_calendar_insights(v_calendar_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_insights_on_event_trigger ON events;
CREATE TRIGGER refresh_insights_on_event_trigger
    AFTER INSERT OR UPDATE OR DELETE ON events
    FOR EACH ROW
    EXECUTE FUNCTION refresh_insights_on_event_change();

-- ============================================
-- Trigger: Refresh insights on order confirmation
-- ============================================

CREATE OR REPLACE FUNCTION refresh_insights_on_order_change()
RETURNS TRIGGER AS $$
DECLARE
    v_calendar_id UUID;
BEGIN
    -- Get calendar_id via event
    SELECT e.calendar_id INTO v_calendar_id
    FROM events e
    WHERE e.id = COALESCE(NEW.event_id, OLD.event_id);
    
    IF v_calendar_id IS NOT NULL THEN
        PERFORM refresh_calendar_insights(v_calendar_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Only trigger on status changes to 'confirmed' for efficiency
DROP TRIGGER IF EXISTS refresh_insights_on_order_trigger ON orders;
CREATE TRIGGER refresh_insights_on_order_trigger
    AFTER INSERT OR UPDATE OF status ON orders
    FOR EACH ROW
    WHEN (NEW.status = 'confirmed')
    EXECUTE FUNCTION refresh_insights_on_order_change();

-- ============================================
-- Trigger: Refresh insights on subscription changes
-- ============================================

CREATE OR REPLACE FUNCTION refresh_insights_on_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
    -- calendar_people already has calendar_id
    PERFORM refresh_calendar_insights(COALESCE(NEW.calendar_id, OLD.calendar_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_insights_on_subscription_trigger ON calendar_people;
CREATE TRIGGER refresh_insights_on_subscription_trigger
    AFTER INSERT OR UPDATE OF subscribed OR DELETE ON calendar_people
    FOR EACH ROW
    EXECUTE FUNCTION refresh_insights_on_subscription_change();

-- ============================================
-- Initialize insights for existing calendars
-- ============================================

-- Insert missing calendar_insights rows
INSERT INTO calendar_insights (calendar_id)
SELECT id FROM calendars
WHERE id NOT IN (SELECT calendar_id FROM calendar_insights)
ON CONFLICT (calendar_id) DO NOTHING;

-- Refresh all insights (run once during migration)
DO $$
DECLARE
    cal_record RECORD;
BEGIN
    FOR cal_record IN SELECT id FROM calendars LOOP
        PERFORM refresh_calendar_insights(cal_record.id);
    END LOOP;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
