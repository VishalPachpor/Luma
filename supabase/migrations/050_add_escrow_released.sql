-- Add escrow_released flag to guests table for reconciliation tracking
ALTER TABLE guests ADD COLUMN IF NOT EXISTS escrow_released BOOLEAN DEFAULT false;

-- Partial index: only rows that still need releasing
CREATE INDEX IF NOT EXISTS idx_guests_escrow_unreleased
  ON guests (id)
  WHERE status = 'checked_in' AND escrow_released = false;
