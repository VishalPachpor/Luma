-- Fix RLS error by making the upsert function SECURITY DEFINER
-- This allows the function to bypass table RLS, but we explicitly check permissions inside.

CREATE OR REPLACE FUNCTION upsert_calendar_person(
    p_calendar_id UUID,
    p_email TEXT,
    p_name TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'event',
    p_source_event_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_person_id UUID;
BEGIN
    -- 1. Authorization Check: Ensure current user owns the calendar
    -- We cast both to text to be safe with comparisons
    IF NOT EXISTS (
        SELECT 1 FROM calendars 
        WHERE id = p_calendar_id 
        AND owner_id::text = auth.uid()::text
    ) THEN
        RAISE EXCEPTION 'Not authorized to add people to this calendar';
    END IF;

    -- 2. Perform the Upsert (Bypassing RLS due to SECURITY DEFINER)
    INSERT INTO calendar_people (calendar_id, email, name, source, source_event_id, updated_at)
    VALUES (p_calendar_id, LOWER(p_email), p_name, p_source, p_source_event_id, NOW())
    ON CONFLICT (calendar_id, email) 
    DO UPDATE SET
        name = COALESCE(EXCLUDED.name, calendar_people.name),
        updated_at = NOW()
    RETURNING id INTO v_person_id;
    
    RETURN v_person_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
