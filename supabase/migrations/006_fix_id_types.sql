-- CRITICAL FIX: event_id and user_id must be TEXT not UUID
-- Firebase uses string IDs like "WU1Ky0siIuyLR02Zg6Oc" which are NOT valid UUIDs

-- Step 1: Drop ALL foreign key constraints on rsvps table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'rsvps' 
        AND constraint_type = 'FOREIGN KEY'
    ) LOOP
        EXECUTE 'ALTER TABLE public.rsvps DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- Step 2: Drop primary key constraint if it exists
ALTER TABLE public.rsvps DROP CONSTRAINT IF EXISTS rsvps_pkey;

-- Step 3: Change column types to TEXT
ALTER TABLE public.rsvps 
    ALTER COLUMN event_id TYPE text USING event_id::text,
    ALTER COLUMN user_id TYPE text USING user_id::text;

-- Step 4: Re-add composite primary key
ALTER TABLE public.rsvps 
    ADD CONSTRAINT rsvps_pkey PRIMARY KEY (user_id, event_id);

-- Step 5: Ensure payment columns exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rsvps' AND column_name = 'payment_reference') THEN
        ALTER TABLE public.rsvps ADD COLUMN payment_reference text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rsvps' AND column_name = 'payment_provider') THEN
        ALTER TABLE public.rsvps ADD COLUMN payment_provider text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rsvps' AND column_name = 'amount_paid') THEN
        ALTER TABLE public.rsvps ADD COLUMN amount_paid decimal(10, 6);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rsvps' AND column_name = 'ticket_type') THEN
        ALTER TABLE public.rsvps ADD COLUMN ticket_type text DEFAULT 'free';
    END IF;
END $$;

-- Step 6: Add indexes
CREATE INDEX IF NOT EXISTS idx_rsvps_event_id ON public.rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user_id ON public.rsvps(user_id);

-- Step 7: Unique constraint for payment idempotency
DROP INDEX IF EXISTS idx_rsvps_payment_unique;
CREATE UNIQUE INDEX idx_rsvps_payment_unique 
ON public.rsvps(payment_reference) 
WHERE payment_reference IS NOT NULL;

-- Verify the fix
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rsvps';
