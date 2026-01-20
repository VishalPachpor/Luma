-- Fix RLS policies to ensure robust type comparison for calendars table
-- This table was blocking users from seeing their own calendar details, 
-- causing the "People" tab to think the user wasn't the owner.

ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own calendars" ON calendars;
DROP POLICY IF EXISTS "Users can manage own calendars" ON calendars;

-- Recreate SELECT policy with robust casting
CREATE POLICY "Users can view own calendars"
    ON calendars FOR SELECT
    USING (owner_id::text = auth.uid()::text);

-- Recreate ALL (Manage) policy with robust casting
CREATE POLICY "Users can manage own calendars"
    ON calendars FOR ALL
    USING (owner_id::text = auth.uid()::text);
