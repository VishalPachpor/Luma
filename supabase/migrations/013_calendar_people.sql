-- ============================================
-- Calendar People (Audience CRM)
-- Migration: 013_calendar_people.sql
-- ============================================

-- This table consolidates all people associated with a calendar
-- across events, newsletter signups, imports, and follows.
-- Email is the deduplication key within each calendar.

CREATE TABLE IF NOT EXISTS calendar_people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    
    -- Identity (email is dedup key)
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    
    -- Acquisition
    source TEXT CHECK (source IN ('event', 'newsletter', 'import', 'follow')),
    source_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Engagement metrics (denormalized for performance)
    events_attended INTEGER DEFAULT 0,
    last_event_at TIMESTAMPTZ,
    
    -- Newsletter status
    subscribed BOOLEAN DEFAULT true,
    unsubscribed_at TIMESTAMPTZ,
    
    -- Tags for segmentation
    tags TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique: one person per email per calendar (dedup key)
    UNIQUE(calendar_id, email)
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_calendar_people_calendar 
    ON calendar_people(calendar_id);

CREATE INDEX IF NOT EXISTS idx_calendar_people_email 
    ON calendar_people(email);

CREATE INDEX IF NOT EXISTS idx_calendar_people_source 
    ON calendar_people(source);

CREATE INDEX IF NOT EXISTS idx_calendar_people_joined 
    ON calendar_people(joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_people_subscribed 
    ON calendar_people(calendar_id, subscribed) 
    WHERE subscribed = true;

-- ============================================
-- Trigger: Auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_calendar_people_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calendar_people_updated_at ON calendar_people;
CREATE TRIGGER calendar_people_updated_at
    BEFORE UPDATE ON calendar_people
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_people_updated_at();

-- ============================================
-- Function: Upsert person (dedupe by email)
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
    INSERT INTO calendar_people (calendar_id, email, name, source, source_event_id)
    VALUES (p_calendar_id, LOWER(p_email), p_name, p_source, p_source_event_id)
    ON CONFLICT (calendar_id, email) 
    DO UPDATE SET
        name = COALESCE(EXCLUDED.name, calendar_people.name),
        updated_at = NOW()
    RETURNING id INTO v_person_id;
    
    RETURN v_person_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Sync people from event guests
-- ============================================

CREATE OR REPLACE FUNCTION sync_calendar_people_from_guests()
RETURNS TRIGGER AS $$
DECLARE
    v_calendar_id UUID;
    v_email TEXT;
BEGIN
    -- Get the calendar ID from the event
    SELECT e.calendar_id INTO v_calendar_id
    FROM events e
    WHERE e.id = NEW.event_id;
    
    -- Only sync if event belongs to a calendar
    IF v_calendar_id IS NOT NULL THEN
        -- Get user email
        SELECT p.email INTO v_email
        FROM profiles p
        WHERE p.id = NEW.user_id;
        
        IF v_email IS NOT NULL THEN
            -- Upsert the person
            PERFORM upsert_calendar_person(
                v_calendar_id,
                v_email,
                (SELECT display_name FROM profiles WHERE id = NEW.user_id),
                'event',
                NEW.event_id
            );
            
            -- Update events_attended count if guest is confirmed
            IF NEW.status IN ('issued', 'approved') THEN
                UPDATE calendar_people 
                SET 
                    events_attended = events_attended + 1,
                    last_event_at = NOW()
                WHERE calendar_id = v_calendar_id 
                AND email = v_email;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-add guests to calendar_people
DROP TRIGGER IF EXISTS sync_guest_to_calendar_people ON guests;
CREATE TRIGGER sync_guest_to_calendar_people
    AFTER INSERT ON guests
    FOR EACH ROW
    EXECUTE FUNCTION sync_calendar_people_from_guests();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE calendar_people ENABLE ROW LEVEL SECURITY;

-- Calendar owners can view their people
CREATE POLICY "Calendar owners can view their people"
    ON calendar_people FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM calendars 
            WHERE calendars.id = calendar_people.calendar_id 
            AND calendars.owner_id = auth.uid()::text
        )
    );

-- Calendar owners can manage their people
CREATE POLICY "Calendar owners can manage their people"
    ON calendar_people FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM calendars 
            WHERE calendars.id = calendar_people.calendar_id 
            AND calendars.owner_id = auth.uid()::text
        )
    );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
