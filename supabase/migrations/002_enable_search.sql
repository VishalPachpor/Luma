-- Enable the pg_trgm extension for fuzzy text search
create extension if not exists pg_trgm;

-- Create a search index on the columns we want to search
-- This speeds up 'ILIKE' and full-text queries
create index if not exists idx_events_search_title on public.events using gin (title gin_trgm_ops);
create index if not exists idx_events_search_description on public.events using gin (description gin_trgm_ops);
create index if not exists idx_events_search_category on public.events using gin (category gin_trgm_ops);

-- Create a generic search function (RPC) that we can call from our API
create or replace function search_events(query_text text)
returns setof public.events
language sql
as $$
  select *
  from public.events
  where 
    title ilike '%' || query_text || '%'
    or description ilike '%' || query_text || '%'
    or category ilike '%' || query_text || '%'
  order by
    -- Rank exact matches higher, then by date
    case 
      when title ilike query_text then 1
      when title ilike query_text || '%' then 2
      else 3
    end,
    date desc
  limit 20;
$$;
