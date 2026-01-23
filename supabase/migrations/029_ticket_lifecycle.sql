-- ============================================================================
-- Ticket/Guest Lifecycle State Machine Migration
-- ============================================================================
-- Adds support for staking and no-show processing:
--   pending → pending_approval → approved → staked → checked_in
--                                              ↓
--                                        refunded/forfeited
--
-- This migration adds:
--   1. Staking-related columns (stake_amount, stake_tx_hash)
--   2. Lifecycle tracking columns (forfeited_at, refunded_at)
--   3. Guest status audit log table
--   4. Performance indexes for no-show processing
-- ============================================================================

-- 1. Add staking and payment tracking columns
ALTER TABLE guests 
  ADD COLUMN IF NOT EXISTS stake_amount DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS stake_currency TEXT DEFAULT 'ETH',
  ADD COLUMN IF NOT EXISTS stake_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS stake_wallet_address TEXT;

-- 2. Add lifecycle tracking columns
ALTER TABLE guests 
  ADD COLUMN IF NOT EXISTS forfeited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS previous_status TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- 3. Create guest status audit log table
CREATE TABLE IF NOT EXISTS guest_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  triggered_by TEXT NOT NULL, -- 'system' or 'user:{uuid}'
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_guest_status_log_guest_id 
  ON guest_status_log(guest_id);

CREATE INDEX IF NOT EXISTS idx_guest_status_log_event_id 
  ON guest_status_log(event_id);

CREATE INDEX IF NOT EXISTS idx_guest_status_log_created_at 
  ON guest_status_log(created_at DESC);

-- 5. Create index for no-show processing query
-- This finds staked guests for ended events
CREATE INDEX IF NOT EXISTS idx_guests_staked_for_noshow 
  ON guests(event_id, status) 
  WHERE status = 'staked';

-- 6. Enable RLS on audit log
ALTER TABLE guest_status_log ENABLE ROW LEVEL SECURITY;

-- 7. Policy: Organizers can view guest status logs for their events
CREATE POLICY "Organizers can view guest status logs"
  ON guest_status_log 
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- 8. Policy: Service role can insert (for system transitions)
CREATE POLICY "Service can insert guest status logs"
  ON guest_status_log 
  FOR INSERT
  WITH CHECK (true);

-- 9. Add comments for documentation
COMMENT ON TABLE guest_status_log IS 
  'Audit log tracking all guest/ticket status transitions';

COMMENT ON COLUMN guests.stake_amount IS 
  'Amount staked/paid for attendance (in stake_currency units)';

COMMENT ON COLUMN guests.stake_tx_hash IS 
  'Blockchain transaction hash for the stake payment';

COMMENT ON COLUMN guests.forfeited_at IS 
  'Timestamp when stake was forfeited due to no-show';

COMMENT ON COLUMN guests.refunded_at IS 
  'Timestamp when stake was refunded';

-- 10. Migrate existing 'scanned' status to 'checked_in' for consistency
-- Note: We keep 'scanned' as a valid status for backwards compatibility
-- but new code should use 'checked_in'
UPDATE guests 
SET 
  previous_status = 'scanned',
  status_changed_at = NOW()
WHERE status = 'scanned' AND status_changed_at IS NULL;
