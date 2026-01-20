-- Calendar Payment Configuration (Crypto Only)
-- Migration: 018_calendar_payments.sql

CREATE TABLE IF NOT EXISTS calendar_payment_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    
    -- Crypto Configuration
    wallet_address TEXT,
    accepted_tokens TEXT[] DEFAULT '{ETH,USDC}', -- Tokens accepted on Fuel
    network TEXT DEFAULT 'fuel',
    
    -- Seller Information (for invoices)
    seller_name TEXT,
    seller_address TEXT,
    memo TEXT,
    
    -- Refund Policy
    refund_policy_type TEXT DEFAULT 'no_refund', -- no_refund, 7_days, custom
    refund_policy_text TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(calendar_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_payment_config_calendar 
    ON calendar_payment_config(calendar_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS calendar_payment_config_updated_at ON calendar_payment_config;
CREATE TRIGGER calendar_payment_config_updated_at
    BEFORE UPDATE ON calendar_payment_config
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_people_updated_at(); -- Reusing existing function

-- RLS
ALTER TABLE calendar_payment_config ENABLE ROW LEVEL SECURITY;

-- Policies (Robust ownership check)
CREATE POLICY "Calendar owners can view payment config"
    ON calendar_payment_config FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM calendars 
            WHERE calendars.id = calendar_payment_config.calendar_id 
            AND calendars.owner_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Calendar owners can manage payment config"
    ON calendar_payment_config FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM calendars 
            WHERE calendars.id = calendar_payment_config.calendar_id 
            AND calendars.owner_id::text = auth.uid()::text
        )
    );
