-- Migration: Add payment support to RSVPs table (combined migration)
-- This adds payment columns AND the idempotency constraint

-- 1. Add payment-related columns (idempotent - uses IF NOT EXISTS equivalent)
DO $$ 
BEGIN
    -- Add payment_reference column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rsvps' AND column_name = 'payment_reference'
    ) THEN
        ALTER TABLE public.rsvps ADD COLUMN payment_reference text;
    END IF;

    -- Add payment_provider column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rsvps' AND column_name = 'payment_provider'
    ) THEN
        ALTER TABLE public.rsvps ADD COLUMN payment_provider text;
    END IF;

    -- Add amount_paid column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rsvps' AND column_name = 'amount_paid'
    ) THEN
        ALTER TABLE public.rsvps ADD COLUMN amount_paid decimal(10, 6);
    END IF;

    -- Add ticket_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rsvps' AND column_name = 'ticket_type'
    ) THEN
        ALTER TABLE public.rsvps ADD COLUMN ticket_type text DEFAULT 'free';
    END IF;
END $$;

-- 2. Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rsvps_payment_ref ON public.rsvps(payment_reference);

-- 3. Create unique constraint for idempotency (prevents duplicate payments)
-- Drop existing non-unique index if it exists, then create unique one
DROP INDEX IF EXISTS idx_rsvps_payment_unique;
CREATE UNIQUE INDEX idx_rsvps_payment_unique 
ON public.rsvps(payment_reference) 
WHERE payment_reference IS NOT NULL;

-- Add comment explaining the constraint
COMMENT ON INDEX idx_rsvps_payment_unique IS 
'Ensures each blockchain transaction can only be used once, preventing duplicate ticket issuance';
