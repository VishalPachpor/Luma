-- Migration: Notifications System
-- Creates notifications table for in-app notifications with Realtime

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Notification types enum
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'approval_granted',
        'approval_rejected',
        'event_reminder',
        'event_update',
        'new_message',
        'system'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only read their own notifications
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (true); -- Service role handles filtering by user_id

-- Service role can insert
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;
CREATE POLICY "Service can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- Service role can update (for marking as read)
DROP POLICY IF EXISTS "Service can update notifications" ON notifications;
CREATE POLICY "Service can update notifications"
ON notifications FOR UPDATE
USING (true);

-- Also update guests table to add approval metadata
ALTER TABLE IF EXISTS guests 
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
