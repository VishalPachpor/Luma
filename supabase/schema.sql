-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users Table (Synced from Firebase Auth)
-- We use TEXT for id to match Firebase's string UID
create table public.users (
  id text primary key, 
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Events Table
create table public.events (
  id text primary key, -- Changed from UUID to TEXT to support migration of existing Firestore IDs
  title text not null,
  description text,
  date timestamptz not null,
  location text,
  organizer_id text references public.users(id) on delete cascade not null,
  cover_image text,
  category text,
  capacity int,
  price decimal(10, 2),
  metadata jsonb default '{}'::jsonb, -- Flexible field for extra data
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RSVPs Table (Join Table)
create type rsvp_status as enum ('going', 'interested', 'not_going');

create table public.rsvps (
  user_id text references public.users(id) on delete cascade not null,
  event_id uuid references public.events(id) on delete cascade not null,
  status rsvp_status default 'going',
  created_at timestamptz default now(),
  primary key (user_id, event_id)
);

-- Row Level Security (RLS)
-- Since we are currently using a "Trusted Broker" pattern via Next.js API (Service Role),
-- we technically bypass RLS. However, it's good practice to enable it and add policies
-- for future direct client access.

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;

-- Public Read Policies
create policy "Allow public read users" on public.users for select using (true);
create policy "Allow public read events" on public.events for select using (true);
create policy "Allow public read rsvps" on public.rsvps for select using (true);

-- Indexes for performance
create index idx_events_organizer on public.events(organizer_id);
create index idx_events_date on public.events(date);
create index idx_rsvps_user on public.rsvps(user_id);
create index idx_rsvps_event on public.rsvps(event_id);
