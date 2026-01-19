-- Create event_hosts table
create type host_role as enum ('host', 'co-host', 'staff');

create table if not exists event_hosts (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade not null,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  role host_role default 'host',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id, email)
);

-- RLS
alter table event_hosts enable row level security;

-- Organizers can view hosts
create policy "Organizers can view hosts"
  on event_hosts for select
  using ( exists ( select 1 from events where id = event_hosts.event_id and organizer_id = auth.uid() ) );

-- Organizers can manage hosts
create policy "Organizers can insert hosts"
  on event_hosts for insert
  with check ( exists ( select 1 from events where id = event_hosts.event_id and organizer_id = auth.uid() ) );

create policy "Organizers can delete hosts"
  on event_hosts for delete
  using ( exists ( select 1 from events where id = event_hosts.event_id and organizer_id = auth.uid() ) );

-- Hosts can view themselves (and the event they are hosting)
create policy "Hosts can view their own host entry"
  on event_hosts for select
  using ( email = (select email from auth.users where id = auth.uid()) );
