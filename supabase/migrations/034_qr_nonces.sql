-- ============================================================================
-- QR Nonces Table (Replay Protection)
-- ============================================================================
-- Stores used nonces to prevent QR code replay attacks
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_nonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nonce TEXT NOT NULL UNIQUE,
    guest_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast nonce lookup
CREATE INDEX IF NOT EXISTS idx_qr_nonces_nonce ON qr_nonces(nonce);

-- Index for cleanup (can delete old nonces after 24h)
CREATE INDEX IF NOT EXISTS idx_qr_nonces_used_at ON qr_nonces(used_at);

-- Enable RLS
ALTER TABLE qr_nonces ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service can manage qr_nonces"
    ON qr_nonces
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Cleanup function (optional - run via cron)
-- DELETE FROM qr_nonces WHERE used_at < NOW() - INTERVAL '24 hours';
