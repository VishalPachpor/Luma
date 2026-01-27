-- ============================================
-- Fix: upsert_calendar_person() auth check for service role
-- Migration: 041_fix_upsert_calendar_person_auth.sql
-- ============================================
-- 
-- Problem: Migration 015 added an auth.uid() check that blocks
-- service role and trigger-based calls (where auth.uid() is NULL).
-- This prevents ticket issuance after payment verification.
--
-- Solution: Skip auth check when auth.uid() is NULL, allowing
-- internal operations (triggers, service role) to proceed.
-- ============================================

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
    -- Authorization Check: Only enforce for direct user API calls
    -- Skip check for service role / trigger-based calls (auth.uid() is NULL)
    IF auth.uid() IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM calendars 
            WHERE id = p_calendar_id 
            AND owner_id::text = auth.uid()::text
        ) THEN
            RAISE EXCEPTION 'Not authorized to add people to this calendar';
        END IF;
    END IF;

    -- Perform the Upsert (Bypassing RLS due to SECURITY DEFINER)
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

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
