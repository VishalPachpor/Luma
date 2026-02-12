
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url);
    RETURN NEW;
END; $$;

-- 1.2 increment_attendee_count
DROP FUNCTION IF EXISTS public.increment_attendee_count(UUID);
CREATE OR REPLACE FUNCTION public.increment_attendee_count(event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    UPDATE public.events SET attendee_count = attendee_count + 1 WHERE id = event_id;
END; $$;

-- 1.3 update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$ BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END; $$;

-- 1.4 update_calendar_people_updated_at
CREATE OR REPLACE FUNCTION public.update_calendar_people_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$ BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END; $$;

-- 1.5 update_search_index_metadata
CREATE OR REPLACE FUNCTION public.update_search_index_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$ BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END; $$;

-- 1.6 refresh_insights_on_order_change
CREATE OR REPLACE FUNCTION public.refresh_insights_on_order_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    PERFORM public.refresh_calendar_insights(
        COALESCE(
            (SELECT calendar_id FROM public.events WHERE id = COALESCE(NEW.event_id, OLD.event_id)),
            NULL
        )
    );
    RETURN COALESCE(NEW, OLD);
END; $$;

-- 1.7 refresh_insights_on_subscription_change
CREATE OR REPLACE FUNCTION public.refresh_insights_on_subscription_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    PERFORM public.refresh_calendar_insights(COALESCE(NEW.calendar_id, OLD.calendar_id));
    RETURN COALESCE(NEW, OLD);
END; $$;

-- 1.8 search_global
DROP FUNCTION IF EXISTS public.search_global(TEXT, INT);
CREATE OR REPLACE FUNCTION public.search_global(search_query TEXT, result_limit INT DEFAULT 10)
RETURNS TABLE(
    id UUID,
    type TEXT,
    title TEXT,
    description TEXT,
    image_url TEXT,
    rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    RETURN QUERY
    SELECT
        si.entity_id AS id,
        si.entity_type AS type,
        si.title,
        si.description,
        si.image_url,
        ts_rank(si.search_vector, plainto_tsquery('english', search_query)) AS rank
    FROM public.search_index si
    WHERE si.search_vector @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC
    LIMIT result_limit;
END; $$;

-- 1.9 get_next_event_version
DROP FUNCTION IF EXISTS public.get_next_event_version(UUID);
CREATE OR REPLACE FUNCTION public.get_next_event_version(p_aggregate_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$ 
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
    FROM public.domain_events
    WHERE aggregate_id = p_aggregate_id;
    RETURN next_version;
END; $$;

-- 1.10 is_calendar_member_secure
DROP FUNCTION IF EXISTS public.is_calendar_member_secure(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_calendar_member_secure(cal_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.calendar_members
        WHERE calendar_id = cal_id AND member_id = user_id
    );
END; $$;

-- 1.11 is_calendar_owner_secure
DROP FUNCTION IF EXISTS public.is_calendar_owner_secure(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_calendar_owner_secure(cal_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.calendar_members
        WHERE calendar_id = cal_id AND member_id = user_id AND role = 'owner'
    );
END; $$;

-- 1.12 is_calendar_admin_secure
DROP FUNCTION IF EXISTS public.is_calendar_admin_secure(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_calendar_admin_secure(cal_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.calendar_members
        WHERE calendar_id = cal_id AND member_id = user_id AND role IN ('owner', 'admin')
    );
END; $$;

-- 1.13 update_categories_updated_at
CREATE OR REPLACE FUNCTION public.update_categories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$ BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END; $$;

-- 1.14 sync_calendar_people_from_guests
CREATE OR REPLACE FUNCTION public.sync_calendar_people_from_guests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    IF NEW.status IN ('issued', 'approved', 'staked', 'checked_in', 'scanned') THEN
        PERFORM public.upsert_calendar_person(
            (SELECT calendar_id FROM public.events WHERE id = NEW.event_id),
            NEW.user_id,
            COALESCE(NEW.email, ''),
            'attendee'
        );
    END IF;
    RETURN NEW;
END; $$;

-- 1.15 update_insights_on_feedback
CREATE OR REPLACE FUNCTION public.update_insights_on_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    PERFORM public.refresh_calendar_insights(
        COALESCE(
            (SELECT calendar_id FROM public.events WHERE id = COALESCE(NEW.event_id, OLD.event_id)),
            NULL
        )
    );
    RETURN COALESCE(NEW, OLD);
END; $$;

-- 1.16 refresh_calendar_insights
DROP FUNCTION IF EXISTS public.refresh_calendar_insights(UUID);
CREATE OR REPLACE FUNCTION public.refresh_calendar_insights(p_calendar_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    IF p_calendar_id IS NULL THEN RETURN; END IF;

    INSERT INTO public.calendar_insights (calendar_id)
    VALUES (p_calendar_id)
    ON CONFLICT (calendar_id) DO UPDATE SET
        updated_at = now();
END; $$;

-- 1.17 create_calendar_insights
CREATE OR REPLACE FUNCTION public.create_calendar_insights()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    INSERT INTO public.calendar_insights (calendar_id)
    VALUES (NEW.id)
    ON CONFLICT (calendar_id) DO NOTHING;
    RETURN NEW;
END; $$;

-- 1.18 update_calendar_members_updated_at
CREATE OR REPLACE FUNCTION public.update_calendar_members_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$ BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END; $$;

-- 1.19 increment_coupon_used_count
DROP FUNCTION IF EXISTS public.increment_coupon_used_count(UUID);
CREATE OR REPLACE FUNCTION public.increment_coupon_used_count(coupon_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    UPDATE public.coupons SET used_count = used_count + 1 WHERE id = coupon_id;
END; $$;

-- 1.20 update_coupons_updated_at
CREATE OR REPLACE FUNCTION public.update_coupons_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$ BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END; $$;

-- 1.21 validate_coupon
DROP FUNCTION IF EXISTS public.validate_coupon(TEXT, UUID, UUID);
CREATE OR REPLACE FUNCTION public.validate_coupon(
    p_code TEXT,
    p_event_id UUID,
    p_ticket_tier_id UUID DEFAULT NULL
)
RETURNS TABLE(
    coupon_id UUID,
    discount_type TEXT,
    discount_value NUMERIC,
    is_valid BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    RETURN QUERY
    SELECT
        c.id AS coupon_id,
        c.discount_type::TEXT,
        c.discount_value,
        (c.is_active AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
         AND (c.valid_from IS NULL OR now() >= c.valid_from)
         AND (c.valid_until IS NULL OR now() <= c.valid_until)) AS is_valid,
        CASE
            WHEN NOT c.is_active THEN 'Coupon is inactive'
            WHEN c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN 'Coupon has been fully used'
            WHEN c.valid_from IS NOT NULL AND now() < c.valid_from THEN 'Coupon is not yet valid'
            WHEN c.valid_until IS NOT NULL AND now() > c.valid_until THEN 'Coupon has expired'
            ELSE 'Valid'
        END AS message
    FROM public.coupons c
    WHERE c.code = p_code
      AND c.event_id = p_event_id
      AND (c.ticket_tier_id IS NULL OR c.ticket_tier_id = p_ticket_tier_id);
END; $$;

-- 1.22 auto_create_owner_role
CREATE OR REPLACE FUNCTION public.auto_create_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    INSERT INTO public.calendar_members (calendar_id, member_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (calendar_id, member_id) DO NOTHING;
    RETURN NEW;
END; $$;

-- 1.23 increment_event_counter
DROP FUNCTION IF EXISTS public.increment_event_counter(UUID);
CREATE OR REPLACE FUNCTION public.increment_event_counter(cal_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    UPDATE public.calendars SET event_count = event_count + 1 WHERE id = cal_id;
END; $$;

-- 1.24 refresh_insights_on_event_change
CREATE OR REPLACE FUNCTION public.refresh_insights_on_event_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    PERFORM public.refresh_calendar_insights(COALESCE(NEW.calendar_id, OLD.calendar_id));
    RETURN COALESCE(NEW, OLD);
END; $$;

-- 1.25 record_invite_open
DROP FUNCTION IF EXISTS public.record_invite_open(UUID);
CREATE OR REPLACE FUNCTION public.record_invite_open(p_token UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    UPDATE public.invitations 
    SET opened_at = COALESCE(opened_at, now()),
        open_count = open_count + 1
    WHERE token = p_token;
END; $$;

-- 1.26 upsert_calendar_person
DROP FUNCTION IF EXISTS public.upsert_calendar_person(UUID, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.upsert_calendar_person(
    p_calendar_id UUID,
    p_user_id UUID,
    p_email TEXT,
    p_source TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    person_id UUID;
BEGIN
    INSERT INTO public.calendar_people (calendar_id, user_id, email, source)
    VALUES (p_calendar_id, p_user_id, p_email, p_source)
    ON CONFLICT (calendar_id, user_id) DO UPDATE SET
        email = COALESCE(NULLIF(EXCLUDED.email, ''), public.calendar_people.email),
        updated_at = now()
    RETURNING id INTO person_id;
    RETURN person_id;
END; $$;

-- 1.27 record_invite_click
DROP FUNCTION IF EXISTS public.record_invite_click(UUID);
CREATE OR REPLACE FUNCTION public.record_invite_click(p_token UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    UPDATE public.invitations 
    SET clicked_at = COALESCE(clicked_at, now()),
        click_count = click_count + 1
    WHERE token = p_token;
END; $$;

-- 1.28 get_invitation_stats
DROP FUNCTION IF EXISTS public.get_invitation_stats(UUID);
CREATE OR REPLACE FUNCTION public.get_invitation_stats(p_event_id UUID)
RETURNS TABLE(
    total_invitations BIGINT,
    total_opened BIGINT,
    total_clicked BIGINT,
    total_rsvped BIGINT,
    open_rate NUMERIC,
    click_rate NUMERIC,
    rsvp_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    total BIGINT;
BEGIN
    SELECT COUNT(*) INTO total FROM public.invitations WHERE event_id = p_event_id;
    
    RETURN QUERY
    SELECT
        total AS total_invitations,
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS total_opened,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS total_clicked,
        COUNT(*) FILTER (WHERE rsvp_status IS NOT NULL) AS total_rsvped,
        CASE WHEN total > 0 THEN ROUND(COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::NUMERIC / total * 100, 1) ELSE 0 END AS open_rate,
        CASE WHEN total > 0 THEN ROUND(COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::NUMERIC / total * 100, 1) ELSE 0 END AS click_rate,
        CASE WHEN total > 0 THEN ROUND(COUNT(*) FILTER (WHERE rsvp_status IS NOT NULL)::NUMERIC / total * 100, 1) ELSE 0 END AS rsvp_rate
    FROM public.invitations
    WHERE event_id = p_event_id;
END; $$;

-- 1.29 update_calendars_updated_at
CREATE OR REPLACE FUNCTION public.update_calendars_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$ BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END; $$;

-- 1.30 update_subscriber_count
CREATE OR REPLACE FUNCTION public.update_subscriber_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$ BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.calendars SET subscriber_count = subscriber_count + 1
        WHERE id = NEW.calendar_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.calendars SET subscriber_count = GREATEST(subscriber_count - 1, 0)
        WHERE id = OLD.calendar_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END; $$;


-- ============================================================================
-- PART 2: Scope service-level RLS policies to service_role
-- Replacing `WITH CHECK (true)` / `USING (true)` on INSERT/UPDATE/ALL
-- with role-scoped checks so only service_role can perform these operations.
-- ============================================================================

-- 2.1 audit_logs — Service can insert
DROP POLICY IF EXISTS "Service can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service can insert audit logs" ON public.audit_logs
    FOR INSERT TO service_role
    WITH CHECK (true);

-- 2.2 chat_messages — Service insert + update
DROP POLICY IF EXISTS "Allow service insert" ON public.chat_messages;
CREATE POLICY "Allow service insert" ON public.chat_messages
    FOR INSERT TO service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service update" ON public.chat_messages;
CREATE POLICY "Allow service update" ON public.chat_messages
    FOR UPDATE TO service_role
    USING (true);

-- 2.3 domain_events — Service manage
DROP POLICY IF EXISTS "Service can manage domain_events" ON public.domain_events;
CREATE POLICY "Service can manage domain_events" ON public.domain_events
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 2.4 event_analytics — Anyone can insert → service_role only
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.event_analytics;
CREATE POLICY "Service can insert analytics" ON public.event_analytics
    FOR INSERT TO service_role
    WITH CHECK (true);

-- 2.5 event_chat_settings — Service manage
DROP POLICY IF EXISTS "Allow service manage settings" ON public.event_chat_settings;
CREATE POLICY "Allow service manage settings" ON public.event_chat_settings
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 2.6 event_log — Service manage
DROP POLICY IF EXISTS "Service can manage event_log" ON public.event_log;
CREATE POLICY "Service can manage event_log" ON public.event_log
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 2.7 event_status_log — Service insert
DROP POLICY IF EXISTS "Service can insert status logs" ON public.event_status_log;
CREATE POLICY "Service can insert status logs" ON public.event_status_log
    FOR INSERT TO service_role
    WITH CHECK (true);

-- 2.8 guest_status_log — Service insert
DROP POLICY IF EXISTS "Service can insert guest status logs" ON public.guest_status_log;
CREATE POLICY "Service can insert guest status logs" ON public.guest_status_log
    FOR INSERT TO service_role
    WITH CHECK (true);

-- 2.9 notifications — Service insert + update
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
CREATE POLICY "Service can insert notifications" ON public.notifications
    FOR INSERT TO service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update notifications" ON public.notifications;
CREATE POLICY "Service can update notifications" ON public.notifications
    FOR UPDATE TO service_role
    USING (true);

-- 2.10 qr_nonces — Service manage
DROP POLICY IF EXISTS "Service can manage qr_nonces" ON public.qr_nonces;
CREATE POLICY "Service can manage qr_nonces" ON public.qr_nonces
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- ============================================================================
-- PART 3: Move pg_trgm extension to 'extensions' schema
-- ============================================================================

-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move extension (drop and recreate in extensions schema)
-- Note: This may fail if pg_trgm objects are referenced. 
-- In that case, run manually after updating dependent objects.
DO $$
BEGIN
    DROP EXTENSION IF EXISTS pg_trgm CASCADE;
    CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
EXCEPTION
    WHEN dependent_objects_still_exist THEN
        RAISE NOTICE 'pg_trgm has dependent objects — skipping move. Run manually after updating references.';
END $$;

-- Grant usage so public schema functions can still use trigram operators
GRANT USAGE ON SCHEMA extensions TO public;