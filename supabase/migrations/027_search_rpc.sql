-- RPC function for global search
-- Usage: supabase.rpc('search_global', { query_text: 'party' })

CREATE OR REPLACE FUNCTION search_global(query_text TEXT)
RETURNS SETOF search_index
LANGUAGE sql
AS $$
  SELECT *
  FROM search_index
  WHERE
    -- Use the pre-computed FTS column
    fts @@ plainto_tsquery('english', query_text)
  ORDER BY
    ts_rank(fts, plainto_tsquery('english', query_text)) DESC,
    updated_at DESC
  LIMIT 20;
$$;
