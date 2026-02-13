-- MASTER FIX for Ticket Issuance Errors
-- Resolves:
-- 1. "relation 'calendar_people' does not exist"
-- 2. "record 'new' has no field 'email'"

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.calendar_people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    source TEXT CHECK (source IN ('event', 'newsletter', 'import', 'follow')),
    source_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    events_attended INTEGER DEFAULT 0,
    last_event_at TIMESTAMPTZ,
    subscribed BOOLEAN DEFAULT true,
    unsubscribed_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(calendar_id, email)
);

-- 2. Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_calendar_people_calendar ON public.calendar_people(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_people_email ON public.calendar_people(email);
CREATE INDEX IF NOT EXISTS idx_calendar_people_source ON public.calendar_people(source);
CREATE INDEX IF NOT EXISTS idx_calendar_people_joined ON public.calendar_people(joined_at DESC);

-- 3. Enable RLS
ALTER TABLE public.calendar_people ENABLE ROW LEVEL SECURITY;

-- 4. Re-apply Policies (Drop first to avoid errors)
DROP POLICY IF EXISTS "Calendar owners can view their people" ON public.calendar_people;
CREATE POLICY "Calendar owners can view their people" ON public.calendar_people
    FOR SELECT USING (EXISTS (SELECT 1 FROM calendars WHERE calendars.id = calendar_people.calendar_id AND calendars.owner_id = auth.uid()::text));

DROP POLICY IF EXISTS "Calendar owners can manage their people" ON public.calendar_people;
CREATE POLICY "Calendar owners can manage their people" ON public.calendar_people
    FOR ALL USING (EXISTS (SELECT 1 FROM calendars WHERE calendars.id = calendar_people.calendar_id AND calendars.owner_id = auth.uid()::text));

-- 5. Ensure upsert function exists
CREATE OR REPLACE FUNCTION public.upsert_calendar_person(
    p_calendar_id UUID,
    p_user_id UUID,
    p_email TEXT,
    p_source TEXT DEFAULT 'event',
    p_source_event_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_person_id UUID;
    v_name TEXT;
BEGIN
    -- Try to get name from profile if not provided
    SELECT display_name INTO v_name FROM public.profiles WHERE id = p_user_id;

    INSERT INTO public.calendar_people (calendar_id, email, name, source, source_event_id)
    VALUES (p_calendar_id, LOWER(p_email), v_name, p_source, p_source_event_id)
    ON CONFLICT (calendar_id, email) 
    DO UPDATE SET
        name = COALESCE(EXCLUDED.name, calendar_people.name),
        updated_at = NOW()
    RETURNING id INTO v_person_id;
    
    RETURN v_person_id;
END;
$$;

-- 6. FIX THE BROKEN TRIGGER FUNCTION
-- This replaces the buggy version from migration 045 that used NEW.email
CREATE OR REPLACE FUNCTION public.sync_calendar_people_from_guests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_calendar_id UUID;
    v_email TEXT;
    v_name TEXT;
BEGIN
    SELECT calendar_id INTO v_calendar_id
    FROM public.events
    WHERE id = NEW.event_id;

    IF v_calendar_id IS NOT NULL AND NEW.status IN ('issued', 'approved', 'staked', 'checked_in', 'scanned') THEN
        -- CORRECTED: Fetch email from profiles, NOT 'NEW.email'
        SELECT email, display_name INTO v_email, v_name
        FROM public.profiles
        WHERE id = NEW.user_id;

        IF v_email IS NOT NULL THEN
            PERFORM public.upsert_calendar_person(
                v_calendar_id,
                NEW.user_id,
                v_email, -- Pass the email fetched from profiles
                'event',
                NEW.event_id
            );
            
            UPDATE public.calendar_people 
            SET 
                events_attended = events_attended + 1,
                last_event_at = NOW()
            WHERE calendar_id = v_calendar_id 
            AND email = v_email;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
