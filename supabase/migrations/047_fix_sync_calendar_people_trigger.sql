-- Fix for "record 'new' has no field 'email'" error on ticket issuance
-- The previous migration (045) introduced a bug in `sync_calendar_people_from_guests`
-- by trying to access `NEW.email` which doesn't exist on the `guests` table.

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
    -- Get calendar ID from the event if it exists
    SELECT calendar_id INTO v_calendar_id
    FROM public.events
    WHERE id = NEW.event_id;

    -- Only sync if event belongs to a calendar and status is valid
    IF v_calendar_id IS NOT NULL AND NEW.status IN ('issued', 'approved', 'staked', 'checked_in', 'scanned') THEN
        -- Get user email and name from profiles (since guests table doesn't have email)
        SELECT email, display_name INTO v_email, v_name
        FROM public.profiles
        WHERE id = NEW.user_id;

        -- Upsert person if we found an email
        IF v_email IS NOT NULL THEN
            PERFORM public.upsert_calendar_person(
                v_calendar_id,
                v_email,
                COALESCE(v_name, ''),
                'attendee', -- source
                NEW.event_id -- source_event_id
            );
            
            -- Update events_attended count
            -- Note: We do this separately to ensure it increments even if upsert was just an update
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
