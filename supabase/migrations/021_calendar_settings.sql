-- ============================================
-- Calendar Settings Extension
-- Migration: 021_calendar_settings.sql
-- ============================================

-- Add configuration columns for calendar settings
ALTER TABLE calendars
ADD COLUMN IF NOT EXISTS event_visibility TEXT DEFAULT 'public' CHECK (event_visibility IN ('public', 'private')),
ADD COLUMN IF NOT EXISTS public_guest_list BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS collect_feedback BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Add index for event_visibility if needed for filtering
CREATE INDEX IF NOT EXISTS idx_calendars_visibility ON calendars(event_visibility);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
