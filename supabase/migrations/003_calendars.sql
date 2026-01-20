-- ============================================
-- Calendar Entity Architecture
-- Migration: 003_calendars.sql
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Calendars Table
-- Represents a subscribable event feed/channel
-- ============================================ 
   
-- Reset tables for clean migration (during dev)
DROP TABLE IF EXISTS calendar_subscriptions CASCADE;
DROP TABLE IF EXISTS calendars CASCADE;

CREATE TABLE IF NOT EXISTS calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    
    -- Owner relationship (Firebase UID)
    owner_id TEXT NOT NULL,
    
    -- Basic info
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$' AND char_length(slug) >= 3 AND char_length(slug) <= 50),
    description TEXT CHECK (char_length(description) <= 500),
    
    -- Branding
    color TEXT DEFAULT 'indigo' CHECK (color IN ('slate', 'pink', 'purple', 'indigo', 'blue', 'green', 'yellow', 'orange', 'red')),
    avatar_url TEXT,
    cover_url TEXT,
    
    -- Location
    location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_global BOOLEAN DEFAULT false,
    
    -- Stats (denormalized for performance)
    subscriber_count INTEGER DEFAULT 0 CHECK (subscriber_count >= 0),
    event_count INTEGER DEFAULT 0 CHECK (event_count >= 0),
    
    -- Visibility
    is_private BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- Calendar Subscriptions Table
-- Many-to-many: Users can subscribe to many calendars
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    -- Notification preferences
    notify_new_events BOOLEAN DEFAULT true,
    notify_reminders BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Prevent duplicate subscriptions
    UNIQUE(calendar_id, user_id)
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Calendars indexes
CREATE INDEX IF NOT EXISTS idx_calendars_owner_id ON calendars(owner_id);
CREATE INDEX IF NOT EXISTS idx_calendars_slug ON calendars(slug);
CREATE INDEX IF NOT EXISTS idx_calendars_created_at ON calendars(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendars_is_private ON calendars(is_private) WHERE is_private = false;

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON calendar_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_calendar_id ON calendar_subscriptions(calendar_id);

-- ============================================
-- Trigger: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_calendars_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calendars_updated_at ON calendars;
CREATE TRIGGER calendars_updated_at
    BEFORE UPDATE ON calendars
    FOR EACH ROW
    EXECUTE FUNCTION update_calendars_updated_at();

-- ============================================
-- Trigger: Auto-update subscriber_count
-- ============================================
CREATE OR REPLACE FUNCTION update_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE calendars SET subscriber_count = subscriber_count + 1 WHERE id = NEW.calendar_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE calendars SET subscriber_count = subscriber_count - 1 WHERE id = OLD.calendar_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscription_count_trigger ON calendar_subscriptions;
CREATE TRIGGER subscription_count_trigger
    AFTER INSERT OR DELETE ON calendar_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscriber_count();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can read public calendars
CREATE POLICY "Public calendars are viewable by everyone"
    ON calendars FOR SELECT
    USING (is_private = false);

-- Owners can do everything with their calendars
CREATE POLICY "Owners can manage their calendars"
    ON calendars FOR ALL
    USING (owner_id = current_setting('app.current_user_id', true));

-- Users can read their own subscriptions
CREATE POLICY "Users can view their subscriptions"
    ON calendar_subscriptions FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true));

-- Users can manage their own subscriptions
CREATE POLICY "Users can manage their subscriptions"
    ON calendar_subscriptions FOR ALL
    USING (user_id = current_setting('app.current_user_id', true));
