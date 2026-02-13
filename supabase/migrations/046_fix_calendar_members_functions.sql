-- ============================================
-- Fix incorrect column name in calendar_members helper functions
-- The column is 'user_id' (TEXT), not 'member_id'
-- Also fixes parameter shadowing (p_ prefix for params)
-- ============================================

-- 1. is_calendar_member_secure
DROP FUNCTION IF EXISTS public.is_calendar_member_secure(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_calendar_member_secure(cal_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.calendar_members cm
        WHERE cm.calendar_id = cal_id AND cm.user_id = p_user_id::text
    );
END; $$;

-- 2. is_calendar_owner_secure
DROP FUNCTION IF EXISTS public.is_calendar_owner_secure(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_calendar_owner_secure(cal_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.calendar_members cm
        WHERE cm.calendar_id = cal_id AND cm.user_id = p_user_id::text AND cm.role = 'owner'
    );
END; $$;

-- 3. is_calendar_admin_secure
DROP FUNCTION IF EXISTS public.is_calendar_admin_secure(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_calendar_admin_secure(cal_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.calendar_members cm
        WHERE cm.calendar_id = cal_id AND cm.user_id = p_user_id::text AND cm.role IN ('owner', 'admin')
    );
END; $$;

-- 4. auto_create_owner_role — this trigger fires on calendar creation
-- and was failing because it referenced member_id
CREATE OR REPLACE FUNCTION public.auto_create_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    INSERT INTO public.calendar_members (calendar_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (calendar_id, user_id) DO NOTHING;
    RETURN NEW;
END; $$;

-- 5. Fix incorrect trigger attachment
-- This trigger was accidentally attached to the events table in a previous migration/setup.
-- We must remove it to fix the "record 'new' has no field 'owner_id'" error.
DROP TRIGGER IF EXISTS trigger_auto_create_owner_role ON public.events;

