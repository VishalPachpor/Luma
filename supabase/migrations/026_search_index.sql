-- Create the unified search index table
CREATE TABLE IF NOT EXISTS search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('event', 'calendar', 'user', 'shortcut', 'action')),
  title TEXT NOT NULL,
  subtitle TEXT,
  keywords TEXT[] DEFAULT '{}',
  url TEXT NOT NULL,
  icon TEXT, -- Lucide icon name or image URL
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Regular column, updated via trigger
  fts tsvector,
  
  -- Prevent duplicate entries for the same entity
  CONSTRAINT search_index_entity_unique UNIQUE (entity_id, entity_type)
);

-- Create GIN index on the FTS column
CREATE INDEX IF NOT EXISTS idx_search_vector ON search_index USING GIN (fts);

-- Enable RLS (Public read, Service role write)
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
ON search_index FOR SELECT
TO public
USING (true);

-- Function to automatically update update_at and fts
CREATE OR REPLACE FUNCTION update_search_index_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update timestamp
    NEW.updated_at = timezone('utc'::text, now());
    
    -- Generate FTS vector
    -- Combining title, subtitle, and keywords
    NEW.fts = to_tsvector('english', 
        NEW.title || ' ' || 
        coalesce(NEW.subtitle, '') || ' ' || 
        array_to_string(coalesce(NEW.keywords, '{}'), ' ')
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to run before insert or update
CREATE TRIGGER update_search_index_metadata_trigger
    BEFORE INSERT OR UPDATE ON search_index
    FOR EACH ROW
    EXECUTE PROCEDURE update_search_index_metadata();
