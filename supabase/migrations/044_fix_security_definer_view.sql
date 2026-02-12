-- ============================================================================
-- Fix: Recreate categories_with_counts as SECURITY INVOKER
-- ============================================================================
-- The Supabase linter flagged this view as SECURITY DEFINER, which means it 
-- runs with the view creator's permissions (bypassing RLS). Recreating with
-- SECURITY INVOKER so it respects the querying user's RLS policies.
-- ============================================================================

DROP VIEW IF EXISTS categories_with_counts;
CREATE VIEW categories_with_counts
WITH (security_invoker = true)
AS
SELECT 
    c.id,
    c.name,
    c.slug,
    c.icon_name,
    c.color,
    c.bg_color,
    c.display_order,
    c.is_active,
    c.created_at,
    c.updated_at,
    COALESCE(COUNT(e.id), 0)::INT AS event_count
FROM categories c
LEFT JOIN events e ON e.category_id = c.id AND e.status = 'published'
GROUP BY c.id, c.name, c.slug, c.icon_name, c.color, c.bg_color, c.display_order, c.is_active, c.created_at, c.updated_at
ORDER BY c.display_order;
