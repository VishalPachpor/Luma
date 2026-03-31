-- Migration: Add multi-token staking support
-- Extends the existing staking fields to support USDT, USDC, SOL, ETH
-- across Ethereum and Solana networks.

-- ─── Events Table ───────────────────────────────────────────────────

-- Add stake currency (the token denomination set by organizer, defaults to USD)
-- The actual token selection is per-attendee, stored in guests table.
ALTER TABLE events ADD COLUMN IF NOT EXISTS stake_currency TEXT DEFAULT 'USD';

-- ─── Guests Table ───────────────────────────────────────────────────

-- Network the stake was made on (ethereum or solana)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS stake_network TEXT;

-- USD equivalent of the staked amount (for reporting/refund tracking)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS stake_amount_usd DECIMAL(18, 2);

-- ─── Indexes ────────────────────────────────────────────────────────

-- Index for multi-token staking queries (find all stakers by currency)
CREATE INDEX IF NOT EXISTS idx_guests_stake_currency
    ON guests(event_id, stake_currency) WHERE status = 'staked';

-- Index for network-specific queries
CREATE INDEX IF NOT EXISTS idx_guests_stake_network
    ON guests(event_id, stake_network) WHERE status = 'staked';

-- ─── Update Status Constraint ───────────────────────────────────────
-- Re-apply constraint with 'checked_in' status (may have been missed in 042)
DO $$
BEGIN
    ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_status_check;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

ALTER TABLE guests ADD CONSTRAINT guests_status_check 
  CHECK (status IN (
    'pending', 
    'pending_approval', 
    'approved', 
    'issued', 
    'staked', 
    'scanned',
    'checked_in',
    'rejected', 
    'revoked', 
    'refunded', 
    'forfeited'
  ));

-- ─── Documentation ──────────────────────────────────────────────────

COMMENT ON COLUMN events.stake_currency IS 'Currency denomination for stake amount (USD, ETH). Default USD.';
COMMENT ON COLUMN guests.stake_network IS 'Blockchain network used for stake: ethereum or solana';
COMMENT ON COLUMN guests.stake_amount_usd IS 'USD equivalent amount at time of staking';
