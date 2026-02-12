-- Create invites table
create table if not exists public.invites (
    id uuid not null default gen_random_uuid(),
    event_id uuid not null references public.events(id) on delete cascade,
    inviter_id uuid not null references public.profiles(id) on delete cascade,
    email text not null,
    code text not null unique,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    constraint invites_pkey primary key (id)
);

-- Enable RLS
alter table public.invites enable row level security;

-- Policies
create policy "Inviters can view their own invites"
    on public.invites for select
    using (auth.uid() = inviter_id);

create policy "Inviters can create invites"
    on public.invites for insert
    with check (auth.uid() = inviter_id);

create policy "Inviters can delete their own invites"
    on public.invites for delete
    using (auth.uid() = inviter_id);

-- Everyone can view invites by code (for accepting)
create policy "Public can view invites by code"
    on public.invites for select
    using (true); 

-- Indexes
create index if not exists invites_event_id_idx on public.invites(event_id);
create index if not exists invites_email_idx on public.invites(email);
create index if not exists invites_code_idx on public.invites(code);

-- Trigger for updated_at
create trigger handle_updated_at before update on public.invites
    for each row execute procedure moddatetime (updated_at);
