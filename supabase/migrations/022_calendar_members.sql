-- ============================================
-- Calendar Members (Multi-Admin Support)
-- Migration: 022_calendar_members.sql
-- ============================================

-- This table allows multiple users to have admin access to a calendar.
CREATE TYPE calendar_role AS ENUM ('admin', 'member', 'viewer');

CREATE TABLE IF NOT EXISTS calendar_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role calendar_role DEFAULT 'admin',
    added_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(calendar_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_members_calendar ON calendar_members(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_members_user ON calendar_members(user_id);

-- Trigger: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_calendar_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calendar_members_updated_at ON calendar_members;
CREATE TRIGGER calendar_members_updated_at
    BEFORE UPDATE ON calendar_members
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_members_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE calendar_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check membership SECURED (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_calendar_member(_calendar_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM calendar_members 
    WHERE calendar_id = _calendar_id 
    AND user_id = auth.uid()::text
  );
$$;

-- Helper function to checking ownership SECURED
CREATE OR REPLACE FUNCTION public.is_calendar_owner(_calendar_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM calendars 
    WHERE id = _calendar_id 
    AND owner_id = auth.uid()::text
  );
$$;

-- 1. View Policy:
-- Users can view members if they are a member OR if they are the owner.
-- Also need to allow users to view their OWN membership record specifically (bootstrapping).
CREATE POLICY "View team members"
    ON calendar_members FOR SELECT
    USING (
        user_id = auth.uid()::text -- Can always see self
        OR
        public.is_calendar_owner(calendar_id) -- Owner can see all
        OR
        public.is_calendar_member(calendar_id) -- Members can see all
    );

-- 2. Management Policy:
-- Only Owners and Admin Members can insert/update/delete
CREATE POLICY "Manage team members"
    ON calendar_members FOR ALL
    USING (
         public.is_calendar_owner(calendar_id)
         OR
         EXISTS (
            SELECT 1 FROM calendar_members
            WHERE calendar_id = calendar_members.calendar_id
            AND user_id = auth.uid()::text
            AND role = 'admin'
         )
    );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
