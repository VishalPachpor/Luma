-- ============================================================================
-- Migration: 025_invitation_lifecycle
-- Description: Production-grade invitation lifecycle system with email tracking,
--              atomic counters, and analytics foundation
-- Author: Lumma Team
-- Date: 2026-01-21
-- ============================================================================

-- ===========================================
-- STEP 1: EXTEND INVITATION STATUS ENUM
-- ===========================================
-- Add new statuses to existing enum (Postgres allows adding values, not removing)
DO $$
BEGIN
    -- Add 'opened' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'opened' AND enumtypid = 'invitation_status'::regtype) THEN
        ALTER TYPE invitation_status ADD VALUE 'opened' AFTER 'sent';
    END IF;
    
    -- Add 'clicked' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'clicked' AND enumtypid = 'invitation_status'::regtype) THEN
        ALTER TYPE invitation_status ADD VALUE 'clicked' AFTER 'opened';
    END IF;
    
    -- Add 'bounced' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bounced' AND enumtypid = 'invitation_status'::regtype) THEN
        ALTER TYPE invitation_status ADD VALUE 'bounced' AFTER 'declined';
    END IF;
END $$;

-- ===========================================
-- STEP 2: EXTEND INVITATIONS TABLE
-- ===========================================

-- Add source column for invite attribution
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'source'
    ) THEN
        ALTER TABLE invitations 
        ADD COLUMN source TEXT DEFAULT 'manual' 
        CHECK (source IN ('manual', 'calendar', 'import', 'csv', 'api'));
    END IF;
END $$;

-- Add calendar_id for calendar-level invites
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'calendar_id'
    ) THEN
        ALTER TABLE invitations 
        ADD COLUMN calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add tracking token for email open pixel
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'tracking_token'
    ) THEN
        ALTER TABLE invitations 
        ADD COLUMN tracking_token UUID DEFAULT gen_random_uuid() UNIQUE;
    END IF;
END $$;

-- Add timestamp tracking columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'sent_at'
    ) THEN
        ALTER TABLE invitations ADD COLUMN sent_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'opened_at'
    ) THEN
        ALTER TABLE invitations ADD COLUMN opened_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'clicked_at'
    ) THEN
        ALTER TABLE invitations ADD COLUMN clicked_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'responded_at'
    ) THEN
        ALTER TABLE invitations ADD COLUMN responded_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add metadata JSONB for extensibility
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE invitations ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add name for display (optional, from contact book)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'recipient_name'
    ) THEN
        ALTER TABLE invitations ADD COLUMN recipient_name TEXT;
    END IF;
END $$;

-- Create index on tracking_token for fast pixel lookups
CREATE INDEX IF NOT EXISTS idx_invitations_tracking_token 
ON invitations(tracking_token);

-- Create index on event_id + status for dashboard queries
CREATE INDEX IF NOT EXISTS idx_invitations_event_status 
ON invitations(event_id, status);

-- ===========================================
-- STEP 3: ADD COUNTERS TO EVENTS TABLE
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'counters'
    ) THEN
        ALTER TABLE events ADD COLUMN counters JSONB DEFAULT '{
            "invites_sent": 0,
            "invites_opened": 0,
            "invites_clicked": 0,
            "rsvp_going": 0,
            "rsvp_interested": 0,
            "checked_in": 0,
            "page_views": 0
        }'::jsonb;
    END IF;
END $$;

-- ===========================================
-- STEP 4: ADD SETTINGS TO EVENTS TABLE
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'settings'
    ) THEN
        ALTER TABLE events ADD COLUMN settings JSONB DEFAULT '{
            "allow_guests": true,
            "allow_plus_one": false,
            "show_guest_list": true,
            "auto_confirm": true,
            "require_approval": false,
            "max_invites_per_user": 50
        }'::jsonb;
    END IF;
END $$;

-- ===========================================
-- STEP 5: LINK GUESTS TO INVITATIONS
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guests' AND column_name = 'invitation_id'
    ) THEN
        ALTER TABLE guests 
        ADD COLUMN invitation_id UUID REFERENCES invitations(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_guests_invitation_id ON guests(invitation_id);

-- ===========================================
-- STEP 6: CREATE EVENT ANALYTICS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS event_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    metric TEXT NOT NULL CHECK (metric IN (
        'view', 'share', 'rsvp_start', 'rsvp_complete', 
        'checkout_start', 'checkout_complete', 'invite_click'
    )),
    value INTEGER DEFAULT 1,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    referrer TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_event_analytics_event_metric 
ON event_analytics(event_id, metric);

CREATE INDEX IF NOT EXISTS idx_event_analytics_created_at 
ON event_analytics(created_at);

-- Partition hint for future scaling (comment for now)
-- PARTITION BY RANGE (created_at);

-- ===========================================
-- STEP 7: CREATE ATOMIC COUNTER FUNCTIONS
-- ===========================================

-- Increment a specific counter in events.counters JSONB
CREATE OR REPLACE FUNCTION increment_event_counter(
    p_event_id UUID,
    p_counter_name TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_value INTEGER;
    v_new_counters JSONB;
BEGIN
    -- Get current value, default to 0 if not exists
    SELECT COALESCE((counters->p_counter_name)::integer, 0)
    INTO v_current_value
    FROM events
    WHERE id = p_event_id
    FOR UPDATE; -- Lock row for atomic update
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found: %', p_event_id;
    END IF;
    
    -- Calculate new value (prevent negative)
    v_current_value := GREATEST(0, v_current_value + p_increment);
    
    -- Update and return new counters
    UPDATE events
    SET counters = counters || jsonb_build_object(p_counter_name, v_current_value),
        updated_at = NOW()
    WHERE id = p_event_id
    RETURNING counters INTO v_new_counters;
    
    RETURN v_new_counters;
END;
$$;

-- Record invite open (idempotent - only records first open)
CREATE OR REPLACE FUNCTION record_invite_open(p_tracking_token UUID)
RETURNS TABLE(
    invitation_id UUID,
    event_id UUID,
    already_opened BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    -- Find invitation by tracking token
    SELECT id, event_id, opened_at
    INTO v_invitation
    FROM invitations
    WHERE tracking_token = p_tracking_token
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Check if already opened
    IF v_invitation.opened_at IS NOT NULL THEN
        RETURN QUERY SELECT 
            v_invitation.id,
            v_invitation.event_id,
            TRUE;
        RETURN;
    END IF;
    
    -- First open - update invitation and increment counter
    UPDATE invitations
    SET opened_at = NOW(),
        status = 'opened',
        updated_at = NOW()
    WHERE id = v_invitation.id;
    
    -- Increment counter
    PERFORM increment_event_counter(v_invitation.event_id, 'invites_opened', 1);
    
    RETURN QUERY SELECT 
        v_invitation.id,
        v_invitation.event_id,
        FALSE;
END;
$$;

-- Record invite click (idempotent - only records first click)
CREATE OR REPLACE FUNCTION record_invite_click(p_tracking_token UUID)
RETURNS TABLE(
    invitation_id UUID,
    event_id UUID,
    already_clicked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    -- Find invitation by tracking token
    SELECT id, event_id, clicked_at, opened_at
    INTO v_invitation
    FROM invitations
    WHERE tracking_token = p_tracking_token
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Check if already clicked
    IF v_invitation.clicked_at IS NOT NULL THEN
        RETURN QUERY SELECT 
            v_invitation.id,
            v_invitation.event_id,
            TRUE;
        RETURN;
    END IF;
    
    -- Click implies open if not already opened
    UPDATE invitations
    SET clicked_at = NOW(),
        opened_at = COALESCE(opened_at, NOW()),
        status = 'clicked',
        updated_at = NOW()
    WHERE id = v_invitation.id;
    
    -- Increment counter
    PERFORM increment_event_counter(v_invitation.event_id, 'invites_clicked', 1);
    
    -- Also count as opened if it wasn't already
    IF v_invitation.opened_at IS NULL THEN
        PERFORM increment_event_counter(v_invitation.event_id, 'invites_opened', 1);
    END IF;
    
    RETURN QUERY SELECT 
        v_invitation.id,
        v_invitation.event_id,
        FALSE;
END;
$$;

-- Get invitation statistics for an event
CREATE OR REPLACE FUNCTION get_invitation_stats(p_event_id UUID)
RETURNS TABLE(
    total_sent BIGINT,
    total_opened BIGINT,
    total_clicked BIGINT,
    total_accepted BIGINT,
    total_declined BIGINT,
    total_bounced BIGINT,
    open_rate NUMERIC,
    click_rate NUMERIC,
    accept_rate NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_sent BIGINT;
    v_opened BIGINT;
    v_clicked BIGINT;
    v_accepted BIGINT;
    v_declined BIGINT;
    v_bounced BIGINT;
BEGIN
    SELECT 
        COUNT(*) FILTER (WHERE status IN ('sent', 'opened', 'clicked', 'accepted', 'declined')),
        COUNT(*) FILTER (WHERE status IN ('opened', 'clicked', 'accepted')),
        COUNT(*) FILTER (WHERE status IN ('clicked', 'accepted')),
        COUNT(*) FILTER (WHERE status = 'accepted'),
        COUNT(*) FILTER (WHERE status = 'declined'),
        COUNT(*) FILTER (WHERE status = 'bounced')
    INTO v_sent, v_opened, v_clicked, v_accepted, v_declined, v_bounced
    FROM invitations
    WHERE event_id = p_event_id;
    
    RETURN QUERY SELECT 
        v_sent,
        v_opened,
        v_clicked,
        v_accepted,
        v_declined,
        v_bounced,
        CASE WHEN v_sent > 0 THEN ROUND((v_opened::numeric / v_sent) * 100, 2) ELSE 0 END,
        CASE WHEN v_sent > 0 THEN ROUND((v_clicked::numeric / v_sent) * 100, 2) ELSE 0 END,
        CASE WHEN v_sent > 0 THEN ROUND((v_accepted::numeric / v_sent) * 100, 2) ELSE 0 END;
END;
$$;

-- ===========================================
-- STEP 8: RLS FOR EVENT ANALYTICS
-- ===========================================
ALTER TABLE event_analytics ENABLE ROW LEVEL SECURITY;

-- Organizers can view analytics for their events
DROP POLICY IF EXISTS "Organizers can view event analytics" ON event_analytics;
CREATE POLICY "Organizers can view event analytics" ON event_analytics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_analytics.event_id 
            AND organizer_id = auth.uid()
        )
    );

-- Anyone can insert analytics (for tracking)
DROP POLICY IF EXISTS "Anyone can insert analytics" ON event_analytics;
CREATE POLICY "Anyone can insert analytics" ON event_analytics
    FOR INSERT
    WITH CHECK (true);

-- ===========================================
-- STEP 9: ADDITIONAL RLS FOR INVITATIONS
-- ===========================================

-- Invitees can view their own invitations
DROP POLICY IF EXISTS "Invitees can view their invitations" ON invitations;
CREATE POLICY "Invitees can view their invitations" ON invitations
    FOR SELECT
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR user_id = auth.uid()
    );

-- Invitees can update (accept/decline) their invitations
DROP POLICY IF EXISTS "Invitees can respond to invitations" ON invitations;
CREATE POLICY "Invitees can respond to invitations" ON invitations
    FOR UPDATE
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR user_id = auth.uid()
    )
    WITH CHECK (
        -- Can only update status to accepted or declined
        status IN ('accepted', 'declined')
    );

-- Service role bypass for tracking functions
DROP POLICY IF EXISTS "Service role full access" ON invitations;
CREATE POLICY "Service role full access" ON invitations
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ===========================================
-- STEP 10: GRANT PERMISSIONS FOR RPC FUNCTIONS
-- ===========================================
GRANT EXECUTE ON FUNCTION increment_event_counter TO authenticated;
GRANT EXECUTE ON FUNCTION increment_event_counter TO service_role;
GRANT EXECUTE ON FUNCTION record_invite_open TO anon;
GRANT EXECUTE ON FUNCTION record_invite_open TO authenticated;
GRANT EXECUTE ON FUNCTION record_invite_open TO service_role;
GRANT EXECUTE ON FUNCTION record_invite_click TO anon;
GRANT EXECUTE ON FUNCTION record_invite_click TO authenticated;
GRANT EXECUTE ON FUNCTION record_invite_click TO service_role;
GRANT EXECUTE ON FUNCTION get_invitation_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_stats TO service_role;

-- ===========================================
-- MIGRATION COMPLETE
-- ===========================================
-- Summary of changes:
-- 1. Extended invitation_status enum with 'opened', 'clicked', 'bounced'
-- 2. Added tracking columns to invitations (source, tracking_token, timestamps)
-- 3. Added counters JSONB to events for atomic stats
-- 4. Added settings JSONB to events for configuration
-- 5. Linked guests to invitations via FK
-- 6. Created event_analytics table for funnel tracking
-- 7. Created atomic counter functions (increment_event_counter)
-- 8. Created idempotent tracking functions (record_invite_open, record_invite_click)
-- 9. Created stats aggregation function (get_invitation_stats)
-- 10. Setup RLS policies for new tables and enhanced existing ones
