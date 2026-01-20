-- ============================================
-- Calendar Coupons
-- Migration: 015_calendar_coupons.sql
-- ============================================

-- Calendar-level coupons that can be applied to any event
-- under that calendar.

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    
    -- Coupon code (case-insensitive, unique per calendar)
    code TEXT NOT NULL,
    
    -- Discount type
    type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
    value DECIMAL(10, 2) NOT NULL CHECK (value > 0),
    
    -- Usage limits
    max_uses INTEGER, -- NULL = unlimited
    used_count INTEGER DEFAULT 0,
    
    -- Validity period
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Scope (which events this coupon applies to)
    -- NULL = all events in calendar
    applicable_event_ids UUID[] DEFAULT NULL,
    
    -- Minimum order amount (optional)
    min_order_amount DECIMAL(10, 2),
    
    -- Status
    active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- Coupon Redemptions (tracking usage)
-- ============================================

CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    discount_amount DECIMAL(10, 2) NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Prevent double redemption per order
    UNIQUE(coupon_id, order_id)
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_coupons_calendar 
    ON coupons(calendar_id);

-- Unique index for case-insensitive code per calendar (replaces UNIQUE constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_calendar_code_unique
    ON coupons(calendar_id, LOWER(code));

CREATE INDEX IF NOT EXISTS idx_coupons_active 
    ON coupons(calendar_id, active) 
    WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon 
    ON coupon_redemptions(coupon_id);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user 
    ON coupon_redemptions(user_id);

-- ============================================
-- Trigger: Update used_count on redemption
-- ============================================

CREATE OR REPLACE FUNCTION increment_coupon_used_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE coupons 
    SET used_count = used_count + 1
    WHERE id = NEW.coupon_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coupon_redemption_count ON coupon_redemptions;
CREATE TRIGGER coupon_redemption_count
    AFTER INSERT ON coupon_redemptions
    FOR EACH ROW
    EXECUTE FUNCTION increment_coupon_used_count();

-- ============================================
-- Trigger: Auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_coupons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coupons_updated_at ON coupons;
CREATE TRIGGER coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_coupons_updated_at();

-- ============================================
-- Function: Validate coupon
-- ============================================

CREATE OR REPLACE FUNCTION validate_coupon(
    p_calendar_id UUID,
    p_code TEXT,
    p_event_id UUID DEFAULT NULL,
    p_order_amount DECIMAL DEFAULT 0
)
RETURNS TABLE (
    is_valid BOOLEAN,
    coupon_id UUID,
    discount_type TEXT,
    discount_value DECIMAL,
    error_message TEXT
) AS $$
DECLARE
    v_coupon RECORD;
BEGIN
    -- Find the coupon
    SELECT * INTO v_coupon
    FROM coupons c
    WHERE c.calendar_id = p_calendar_id 
    AND LOWER(c.code) = LOWER(p_code);
    
    -- Coupon not found
    IF v_coupon IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::DECIMAL, 'Coupon not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if active
    IF NOT v_coupon.active THEN
        RETURN QUERY SELECT false, v_coupon.id, NULL::TEXT, NULL::DECIMAL, 'Coupon is inactive'::TEXT;
        RETURN;
    END IF;
    
    -- Check expiry
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
        RETURN QUERY SELECT false, v_coupon.id, NULL::TEXT, NULL::DECIMAL, 'Coupon has expired'::TEXT;
        RETURN;
    END IF;
    
    -- Check start date
    IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > NOW() THEN
        RETURN QUERY SELECT false, v_coupon.id, NULL::TEXT, NULL::DECIMAL, 'Coupon is not yet valid'::TEXT;
        RETURN;
    END IF;
    
    -- Check usage limit
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
        RETURN QUERY SELECT false, v_coupon.id, NULL::TEXT, NULL::DECIMAL, 'Coupon usage limit reached'::TEXT;
        RETURN;
    END IF;
    
    -- Check minimum order amount
    IF v_coupon.min_order_amount IS NOT NULL AND p_order_amount < v_coupon.min_order_amount THEN
        RETURN QUERY SELECT false, v_coupon.id, NULL::TEXT, NULL::DECIMAL, 
            'Minimum order amount of $' || v_coupon.min_order_amount || ' required'::TEXT;
        RETURN;
    END IF;
    
    -- Check event applicability
    IF v_coupon.applicable_event_ids IS NOT NULL AND p_event_id IS NOT NULL THEN
        IF NOT (p_event_id = ANY(v_coupon.applicable_event_ids)) THEN
            RETURN QUERY SELECT false, v_coupon.id, NULL::TEXT, NULL::DECIMAL, 
                'Coupon not valid for this event'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Valid coupon
    RETURN QUERY SELECT true, v_coupon.id, v_coupon.type, v_coupon.value, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Calendar owners can manage coupons
CREATE POLICY "Calendar owners can manage coupons"
    ON coupons FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM calendars 
            WHERE calendars.id = coupons.calendar_id 
            AND calendars.owner_id = auth.uid()::text
        )
    );

-- Users can validate coupons (select only)
CREATE POLICY "Users can validate coupons"
    ON coupons FOR SELECT
    USING (active = true);

-- Users can view their own redemptions
CREATE POLICY "Users can view their redemptions"
    ON coupon_redemptions FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
