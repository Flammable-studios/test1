-- JobTag schema for Supabase
-- Run this in your Supabase project: SQL Editor -> New query -> Run.

-- Accounts / profiles (one row per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  xp bigint not null default 0,
  created_at timestamptz not null default now()
);

-- Job listings
create table if not exists public.jobs (
  id text primary key,
  title text not null,
  category text not null,
  price numeric not null,
  location text not null,
  note text not null default '',
  status text not null default 'open',
  posted bigint not null,
  custom_label text,
  claimed_by uuid references public.profiles (id) on delete set null,
  claimed_at bigint,
  posted_by uuid references public.profiles (id) on delete set null,
  completed_at bigint,
  promoted boolean not null default false,
  promoted_at bigint,
  poster_email text,
  notify_email boolean not null default false
);

-- Award XP to a profile (runs as the table owner, bypasses RLS)
create or replace function public.increment_xp(target uuid, amount bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set xp = xp + amount where id = target;
$$;

-- Row level security
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;

-- Profiles: users read/update their own row
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id);

-- Jobs: anyone can browse; signed-in users can post, claim, complete, promote
drop policy if exists "jobs select all" on public.jobs;
create policy "jobs select all" on public.jobs
  for select using (true);

drop policy if exists "jobs insert authed" on public.jobs;
create policy "jobs insert authed" on public.jobs
  for insert with check (auth.uid() is not null);

drop policy if exists "jobs update all" on public.jobs;
create policy "jobs update all" on public.jobs
  for update using (true);

drop policy if exists "jobs delete all" on public.jobs;
create policy "jobs delete all" on public.jobs
  for delete using (true);
