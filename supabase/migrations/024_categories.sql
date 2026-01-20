-- ============================================================================
-- Migration: 024_categories
-- Description: Create categories table with event relationship and seed data
-- ============================================================================

-- ===========================================
-- CATEGORIES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    icon_name TEXT NOT NULL,           -- Lucide icon name (e.g., 'Cpu', 'Utensils')
    color TEXT NOT NULL,               -- Tailwind text color class (e.g., 'text-orange-400')
    bg_color TEXT NOT NULL,            -- Tailwind bg color class (e.g., 'bg-orange-400/10')
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT categories_name_unique UNIQUE (name),
    CONSTRAINT categories_slug_unique UNIQUE (slug)
);

-- ===========================================
-- ADD CATEGORY REFERENCE TO EVENTS
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE events ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Index for efficient category filtering
CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id);

-- ===========================================
-- SEED INITIAL CATEGORIES
-- ===========================================
INSERT INTO categories (name, slug, icon_name, color, bg_color, display_order) VALUES
    ('Tech', 'tech', 'Cpu', 'text-orange-400', 'bg-orange-400/10', 1),
    ('Food & Drink', 'food-drink', 'Utensils', 'text-yellow-500', 'bg-yellow-500/10', 2),
    ('AI', 'ai', 'BrainCircuit', 'text-pink-500', 'bg-pink-500/10', 3),
    ('Arts & Culture', 'arts-culture', 'Palette', 'text-yellow-400', 'bg-yellow-400/10', 4),
    ('Climate', 'climate', 'Leaf', 'text-green-400', 'bg-green-400/10', 5),
    ('Fitness', 'fitness', 'Dumbbell', 'text-orange-500', 'bg-orange-500/10', 6),
    ('Wellness', 'wellness', 'Sparkles', 'text-teal-400', 'bg-teal-400/10', 7),
    ('Crypto', 'crypto', 'Bitcoin', 'text-indigo-400', 'bg-indigo-400/10', 8)
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories
DROP POLICY IF EXISTS "Categories are readable by everyone" ON categories;
CREATE POLICY "Categories are readable by everyone" ON categories
    FOR SELECT USING (true);

-- ===========================================
-- VIEW: CATEGORIES WITH EVENT COUNTS
-- Aggregates event counts dynamically
-- ===========================================
DROP VIEW IF EXISTS categories_with_counts;
CREATE VIEW categories_with_counts AS
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

-- ===========================================
-- UPDATED_AT TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_updated_at();
