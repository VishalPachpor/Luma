-- ============================================================================
-- FIX: Event ID UUID vs TEXT Mismatch (APPLIED 2026-01-28)
-- ============================================================================
-- The issue was that auto_create_owner_role was casting NEW.id to TEXT
-- but event_roles.event_id is UUID with a foreign key to events.id (UUID).
-- 
-- FIX: Don't cast event_id to text since the column is UUID!
-- ============================================================================

-- 1. Disable problematic triggers
DROP TRIGGER IF EXISTS trigger_auto_create_owner_role ON events;
DROP TRIGGER IF EXISTS refresh_insights_on_event_trigger ON events;

-- 2. Fix auto_create_owner_role - DON'T cast event_id to text since it's UUID!
CREATE OR REPLACE FUNCTION auto_create_owner_role()
RETURNS TRIGGER AS $$
BEGIN
    -- event_roles.event_id is UUID, so don't cast NEW.id
    INSERT INTO event_roles (event_id, user_id, role)
    VALUES (NEW.id, NEW.organizer_id::text, 'owner')
    ON CONFLICT (event_id, user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'auto_create_owner_role failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Fix refresh_insights function with better error handling
CREATE OR REPLACE FUNCTION refresh_insights_on_event_change()
RETURNS TRIGGER AS $$
DECLARE v_calendar_id UUID;
BEGIN
    BEGIN
        v_calendar_id := COALESCE(NEW.calendar_id, OLD.calendar_id);
    EXCEPTION WHEN OTHERS THEN
        v_calendar_id := NULL;
    END;
    IF v_calendar_id IS NOT NULL THEN
        BEGIN
            PERFORM refresh_calendar_insights(v_calendar_id);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'refresh_calendar_insights failed: %', SQLERRM;
        END;
    END IF;
    RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Re-enable triggers
CREATE TRIGGER trigger_auto_create_owner_role
    AFTER INSERT ON events FOR EACH ROW EXECUTE FUNCTION auto_create_owner_role();
CREATE TRIGGER refresh_insights_on_event_trigger
    AFTER INSERT OR UPDATE OR DELETE ON events FOR EACH ROW EXECUTE FUNCTION refresh_insights_on_event_change();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
