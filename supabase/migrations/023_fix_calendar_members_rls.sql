-- ============================================
-- Fix Calendar Members RLS (Recursion Bug)
-- Migration: 023_fix_calendar_members_rls.sql
-- ============================================

-- Description: The previous migration introduced infinite recursion in the RLS policies
-- by querying the `calendar_members` table directly within its own policy.
-- This migration drops the old policies and replaces them with a SECURITY DEFINER approach.

-- 1. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Members can view team" ON calendar_members;
DROP POLICY IF EXISTS "Owners can manage members" ON calendar_members;
DROP POLICY IF EXISTS "Admins can manage members" ON calendar_members;
DROP POLICY IF EXISTS "View team members" ON calendar_members; -- In case the user applied the intermediate fix manually
DROP POLICY IF EXISTS "Manage team members" ON calendar_members;

-- 2. Create Helper Functions (SECURITY DEFINER to bypass RLS)

-- Helper: Check if current user is a member of the calendar
CREATE OR REPLACE FUNCTION public.is_calendar_member_secure(_calendar_id UUID)
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

-- Helper: Check if current user is the owner of the calendar
CREATE OR REPLACE FUNCTION public.is_calendar_owner_secure(_calendar_id UUID)
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

-- 3. Re-create Policies using the secure functions

-- Policy: View Team Members
-- Allowed if: You are the user yourself, OR you are an owner, OR you are a member.
CREATE POLICY "View team members_v2"
    ON calendar_members FOR SELECT
    USING (
        user_id = auth.uid()::text
        OR
        public.is_calendar_owner_secure(calendar_id)
        OR
        public.is_calendar_member_secure(calendar_id)
    );

-- Policy: Manage Team Members
-- Allowed if: You are the owner OR you are an Admin member.
-- Note: internal check for 'admin' role still needs to bypass RLS to avoid recursion if we query the table.
-- We can reuse `is_calendar_member_secure` but we need to check role too.

CREATE OR REPLACE FUNCTION public.is_calendar_admin_secure(_calendar_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM calendar_members 
    WHERE calendar_id = _calendar_id 
    AND user_id = auth.uid()::text
    AND role = 'admin'
  );
$$;

CREATE POLICY "Manage team members_v2"
    ON calendar_members FOR ALL
    USING (
         public.is_calendar_owner_secure(calendar_id)
         OR
         public.is_calendar_admin_secure(calendar_id)
    );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
