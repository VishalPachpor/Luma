-- Migration: Add payment support to RSVPs table
-- This fixes the schema mismatch and adds payment tracking columns

-- 1. Fix event_id type (was UUID, but Firebase uses TEXT IDs)
-- First drop the foreign key constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'rsvps_event_id_fkey' 
        AND table_name = 'rsvps'
    ) THEN
        ALTER TABLE public.rsvps DROP CONSTRAINT rsvps_event_id_fkey;
    END IF;
END $$;

-- Change event_id column type from UUID to TEXT
ALTER TABLE public.rsvps 
    ALTER COLUMN event_id TYPE text USING event_id::text;

-- 2. Add payment-related columns
ALTER TABLE public.rsvps 
    ADD COLUMN IF NOT EXISTS payment_reference text,
    ADD COLUMN IF NOT EXISTS payment_provider text,
    ADD COLUMN IF NOT EXISTS amount_paid decimal(10, 6),
    ADD COLUMN IF NOT EXISTS ticket_type text DEFAULT 'free';

-- 3. Create index for idempotency checks on payment_reference
CREATE INDEX IF NOT EXISTS idx_rsvps_payment_ref ON public.rsvps(payment_reference);

-- 4. Also fix events table if needed (ensure id is TEXT not UUID)
-- Check current type and skip if already correct
DO $$
BEGIN
    -- Only alter if the column is uuid type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.events ALTER COLUMN id TYPE text USING id::text;
    END IF;
END $$;
