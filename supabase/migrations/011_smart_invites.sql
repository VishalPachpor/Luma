-- 1. Invitations Table
create type invitation_status as enum ('pending', 'sent', 'accepted', 'declined');

create table if not exists invitations (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade not null,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  status invitation_status default 'pending',
  invited_by uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id, email)
);

-- RLS for Invitations
alter table invitations enable row level security;

create policy "Users can view invitations for events they organize"
  on invitations for select
  using ( exists ( select 1 from events where id = invitations.event_id and organizer_id = auth.uid() ) );

create policy "Users can insert invitations for events they organize"
  on invitations for insert
  with check ( exists ( select 1 from events where id = invitations.event_id and organizer_id = auth.uid() ) );

create policy "Users can update invitations for events they organize"
  on invitations for update
  using ( exists ( select 1 from events where id = invitations.event_id and organizer_id = auth.uid() ) );

create policy "Users can delete invitations for events they organize"
  on invitations for delete
  using ( exists ( select 1 from events where id = invitations.event_id and organizer_id = auth.uid() ) );

-- 2. Contact Book Table
create table if not exists contact_book (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users(id) on delete cascade not null,
  email text not null,
  name text,
  last_invited_at timestamp with time zone,
  invite_count integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(owner_id, email)
);

-- RLS for Contact Book
alter table contact_book enable row level security;

create policy "Users can view their own contacts"
  on contact_book for select
  using ( auth.uid() = owner_id );

create policy "Users can manage their own contacts"
  on contact_book for all
  using ( auth.uid() = owner_id );

-- 3. Invite Limits Table
create table if not exists invite_limits (
  event_id uuid references events(id) on delete cascade primary key,
  limit_count integer default 50 not null,
  used_count integer default 0 not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Invite Limits
alter table invite_limits enable row level security;

create policy "Organizers can view limits"
  on invite_limits for select
  using ( exists ( select 1 from events where id = invite_limits.event_id and organizer_id = auth.uid() ) );

-- Triggers for updated_at
create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at before update on invitations
  for each row execute procedure moddatetime (updated_at);
