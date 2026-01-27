-- Migration: Add staking support to events table
-- Run this in Supabase SQL editor

-- Add staking fields to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS require_stake BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS stake_amount DECIMAL(18, 8) DEFAULT NULL;

-- Update guests status constraint to include 'staked' status
-- First drop existing constraint if it exists
DO $$
BEGIN
    ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_status_check;
EXCEPTION
    WHEN undefined_object THEN
        -- Constraint doesn't exist, ignore
        NULL;
END $$;

-- Add updated constraint with all valid statuses including 'staked'
ALTER TABLE guests ADD CONSTRAINT guests_status_check 
  CHECK (status IN (
    'pending', 
    'pending_approval', 
    'approved', 
    'issued', 
    'staked', 
    'scanned', 
    'rejected', 
    'revoked', 
    'refunded', 
    'forfeited'
  ));

-- Add index for efficient staking queries
CREATE INDEX IF NOT EXISTS idx_guests_staked ON guests(event_id) WHERE status = 'staked';

-- Comment for documentation
COMMENT ON COLUMN events.require_stake IS 'If true, attendees must stake ETH to register';
COMMENT ON COLUMN events.stake_amount IS 'Amount of ETH to stake (in ETH, not wei)';
