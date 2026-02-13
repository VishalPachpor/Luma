-- Migration: Ensure calendar_people table exists
-- Sometimes migration 013 might have failed or been skipped in local dev.
-- This script ensures the table and its dependencies exist.

DO $$ 
BEGIN
    -- Create table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_people') THEN
        CREATE TABLE calendar_people (
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

        -- Indexes
        CREATE INDEX idx_calendar_people_calendar ON calendar_people(calendar_id);
        CREATE INDEX idx_calendar_people_email ON calendar_people(email);
        CREATE INDEX idx_calendar_people_source ON calendar_people(source);
        CREATE INDEX idx_calendar_people_joined ON calendar_people(joined_at DESC);
        CREATE INDEX idx_calendar_people_subscribed ON calendar_people(calendar_id, subscribed) WHERE subscribed = true;

        -- RLS
        ALTER TABLE calendar_people ENABLE ROW LEVEL SECURITY;

        -- RLS Policies
        -- Calendar owners can view their people
        EXECUTE 'CREATE POLICY "Calendar owners can view their people" ON calendar_people FOR SELECT USING (EXISTS (SELECT 1 FROM calendars WHERE calendars.id = calendar_people.calendar_id AND calendars.owner_id = auth.uid()::text))';

        -- Calendar owners can manage their people
        EXECUTE 'CREATE POLICY "Calendar owners can manage their people" ON calendar_people FOR ALL USING (EXISTS (SELECT 1 FROM calendars WHERE calendars.id = calendar_people.calendar_id AND calendars.owner_id = auth.uid()::text))';

        -- Trigger for updated_at
        EXECUTE 'CREATE TRIGGER calendar_people_updated_at BEFORE UPDATE ON calendar_people FOR EACH ROW EXECUTE FUNCTION update_calendar_people_updated_at()';
        
    END IF;
END $$;
