-- Fix RLS policies to ensure robust type comparison
-- Issues with uuid vs text casting often cause RLS to silently filter rows

DROP POLICY IF EXISTS "Calendar owners can view their people" ON calendar_people;
DROP POLICY IF EXISTS "Calendar owners can manage their people" ON calendar_people;

-- Recreate SELECT policy
CREATE POLICY "Calendar owners can view their people"
    ON calendar_people FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM calendars 
            WHERE calendars.id = calendar_people.calendar_id 
            AND calendars.owner_id::text = auth.uid()::text
        )
    );

-- Recreate ALL (Manage) policy
CREATE POLICY "Calendar owners can manage their people"
    ON calendar_people FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM calendars 
            WHERE calendars.id = calendar_people.calendar_id 
            AND calendars.owner_id::text = auth.uid()::text
        )
    );
