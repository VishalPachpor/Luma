-- Migration: Event Chat System (Luma-style)
-- Creates tables for real-time event chat using Supabase Realtime

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Chat message types
DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'system', 'announcement');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Chat messages table
-- Denormalized sender info to avoid N+1 queries
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT NOT NULL,
    user_id TEXT,
    sender_name TEXT NOT NULL,
    sender_avatar TEXT,
    content TEXT NOT NULL,
    type message_type DEFAULT 'text',
    reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Event chat settings (enable/disable, locked state)
CREATE TABLE IF NOT EXISTS event_chat_settings (
    event_id TEXT PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_event ON chat_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_chat_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages
-- Anyone can read non-deleted messages
DROP POLICY IF EXISTS "Allow read non-deleted messages" ON chat_messages;
CREATE POLICY "Allow read non-deleted messages"
ON chat_messages FOR SELECT
USING (deleted_at IS NULL);

-- Service role can insert (we use trusted broker pattern via API)
DROP POLICY IF EXISTS "Allow service insert" ON chat_messages;
CREATE POLICY "Allow service insert"
ON chat_messages FOR INSERT
WITH CHECK (true);

-- Service role can update (for soft delete)
DROP POLICY IF EXISTS "Allow service update" ON chat_messages;
CREATE POLICY "Allow service update"
ON chat_messages FOR UPDATE
USING (true);

-- RLS Policies for event_chat_settings
DROP POLICY IF EXISTS "Allow read chat settings" ON event_chat_settings;
CREATE POLICY "Allow read chat settings"
ON event_chat_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow service manage settings" ON event_chat_settings;
CREATE POLICY "Allow service manage settings"
ON event_chat_settings FOR ALL
USING (true);

-- Enable Realtime for chat_messages
-- This allows Supabase Realtime to broadcast changes
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
