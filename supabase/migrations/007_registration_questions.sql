-- Add JSONB columns for flexible form data storage
-- Uses IF NOT EXISTS to be safe

-- 1. Add registration_questions to events table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'registration_questions') THEN
        ALTER TABLE public.events ADD COLUMN registration_questions JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Add answers to rsvps table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rsvps' AND column_name = 'answers') THEN
        ALTER TABLE public.rsvps ADD COLUMN answers JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 3. Create GIN index on answers for future analytics (e.g. "Find all users who answered X")
CREATE INDEX IF NOT EXISTS idx_rsvps_answers ON public.rsvps USING GIN (answers);
