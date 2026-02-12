-- ============================================================================
-- Fix: Add 'checked_in' to guests status constraint
-- ============================================================================
-- The previous constraint (migration 042) omitted 'checked_in' as a valid 
-- status, forcing the checkin API to use 'scanned' only. This migration 
-- adds 'checked_in' so both statuses are valid, aligning DB with the 
-- application-level state machine.
-- ============================================================================

-- Drop existing constraint
DO $$
BEGIN
    ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_status_check;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Recreate with complete status set (including 'checked_in')
ALTER TABLE guests ADD CONSTRAINT guests_status_check 
  CHECK (status IN (
    'pending', 
    'pending_approval', 
    'approved', 
    'issued', 
    'staked', 
    'checked_in',
    'scanned', 
    'rejected', 
    'revoked', 
    'refunded', 
    'forfeited'
  ));
